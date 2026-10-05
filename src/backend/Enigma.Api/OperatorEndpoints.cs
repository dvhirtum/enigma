using Enigma.Application.OperatorMode;

namespace Enigma.Api;

internal static class OperatorEndpoints
{
    public static IServiceCollection AddOperatorHandlers(this IServiceCollection services)
    {
        return services
            .AddSingleton<OperatorContexts>()
            .AddSingleton<StartSendingHandler>()
            .AddSingleton<FindReceivingKeysHandler>()
            .AddSingleton<StartReceivingHandler>()
            .AddSingleton<ChooseGroupsHandler>()
            .AddSingleton<FinishMessageHandler>()
            .AddSingleton<CancelOperatorHandler>();
    }

    public static void MapOperatorEndpoints(this IEndpointRouteBuilder app)
    {
        var operatorMode = app.MapGroup("/api/operator")
            .WithTags("Operator")
            .ProducesProblem(StatusCodes.Status400BadRequest);

        operatorMode.MapPost("/send", (StartSendingHandler handler) =>
                handler.Handle(new StartSending()))
            .WithSummary("Starts sending a message with the applied daily key.");

        operatorMode.MapPost("/receiving-keys", (FindReceivingKeys query, FindReceivingKeysHandler handler) =>
                handler.Handle(query))
            .WithSummary("Finds the key sheet days a radio message can be received with on a date.");

        operatorMode.MapPost("/receive", (StartReceiving command, StartReceivingHandler handler) =>
                handler.Handle(command))
            .WithSummary("Starts receiving a radio message, with a key sheet day or the applied key.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        operatorMode.MapPut("/groups", (ChooseGroups command, ChooseGroupsHandler handler) =>
                handler.Handle(command))
            .WithSummary("Chooses the Schlüsselkenngruppe, Verfahrenkenngruppe and fillers to send with.");

        operatorMode.MapPost("/finish", (FinishMessageHandler handler) =>
                handler.Handle(new FinishMessage()))
            .WithSummary("Finishes the message being sent and gives the radio message.");

        operatorMode.MapDelete("/", (CancelOperatorHandler handler) =>
                handler.Handle(new CancelOperator()))
            .WithSummary("Cancels the procedure.");
    }
}
