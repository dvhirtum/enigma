using Enigma.Application.OperatorMode;

namespace Enigma.Api;

internal static class OperatorEndpoints
{
    public static IServiceCollection AddOperatorHandlers(this IServiceCollection services) => services
        .AddSingleton<OperatorContexts>()
        .AddSingleton<StartSendingHandler>()
        .AddSingleton<FindReceivingKeysHandler>()
        .AddSingleton<StartReceivingHandler>()
        .AddSingleton<ChooseGroupsHandler>()
        .AddSingleton<FinishMessageHandler>()
        .AddSingleton<CancelOperatorHandler>();

    public static void MapOperatorEndpoints(this IEndpointRouteBuilder app)
    {
        var operatorMode = app.MapGroup("/api/operator");

        operatorMode.MapPost("/send", (StartSendingHandler handler) =>
            handler.Handle(new StartSending()));

        operatorMode.MapPost("/receiving-keys", (FindReceivingKeys query, FindReceivingKeysHandler handler) =>
            handler.Handle(query));

        operatorMode.MapPost("/receive", (StartReceiving command, StartReceivingHandler handler) =>
            handler.Handle(command));

        operatorMode.MapPut("/groups", (ChooseGroups command, ChooseGroupsHandler handler) =>
            handler.Handle(command));

        operatorMode.MapPost("/finish", (FinishMessageHandler handler) =>
            handler.Handle(new FinishMessage()));

        operatorMode.MapDelete("/", (CancelOperatorHandler handler) =>
            handler.Handle(new CancelOperator()));
    }
}
