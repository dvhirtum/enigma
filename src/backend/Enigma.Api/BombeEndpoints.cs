using Enigma.Application.Bombe;

namespace Enigma.Api;

internal sealed record PlacementRequest(int Position);

internal sealed record SpeedRequest(double? Speed);

internal sealed record RunRequest(double? Speed, bool Notebook);

internal sealed record JackRequest(string? Letter);

internal sealed record RowRequest(string? Rotor, int UpTo);

internal sealed record StartRequest(string? Start);

internal sealed record TestRegisterRequest(string? Letter, string? Input);

internal sealed record JoinRequest(bool Joined);

internal sealed record CheckRequest(string? Steckers, int? RightRing);

internal sealed record VerdictRequest(string? Verdict);

internal sealed record PinchRequest(string? SheetId, int? Day);

internal sealed record IndicatorRequest(string? Schluesselkenngruppe, string? Verfahrenkenngruppe);

internal sealed record RingsRequest(int? Left, int? Middle);

internal static class BombeEndpoints
{
    public static IServiceCollection AddBombeHandlers(this IServiceCollection services) => services
        .AddSingleton<GetBombeStateHandler>()
        .AddSingleton<SetCipherTextHandler>()
        .AddSingleton<LoadInterceptHandler>()
        .AddSingleton<GenerateExerciseHandler>()
        .AddSingleton<GetSourceCribHandler>()
        .AddSingleton<GetSolutionHandler>()
        .AddSingleton<SetCribHandler>()
        .AddSingleton<PlaceCribHandler>()
        .AddSingleton<SetMenuHandler>()
        .AddSingleton<BuildMenuHandler>()
        .AddSingleton<PlugUpMenuHandler>()
        .AddSingleton<ConfigureBombeHandler>()
        .AddSingleton<PlugJackHandler>()
        .AddSingleton<FitRowHandler>()
        .AddSingleton<RemoveDrumHandler>()
        .AddSingleton<TurnScramblerHandler>()
        .AddSingleton<SetTestRegisterHandler>()
        .AddSingleton<JoinChainsHandler>()
        .AddSingleton<ClearStopsHandler>()
        .AddSingleton<ClearPrintoutHandler>()
        .AddSingleton<StartRunHandler>()
        .AddSingleton<SetRunSpeedHandler>()
        .AddSingleton<ContinueRunHandler>()
        .AddSingleton<CancelRunHandler>()
        .AddSingleton<GetRunHandler>()
        .AddSingleton<GetStopsHandler>()
        .AddSingleton<GetPrintoutHandler>()
        .AddSingleton<SetCheckingMachineHandler>()
        .AddSingleton<PressCheckingKeyHandler>()
        .AddSingleton<SetUpCheckingMachineHandler>()
        .AddSingleton<GetCheckHandler>()
        .AddSingleton<SetCheckHandler>()
        .AddSingleton<ConfirmCheckHandler>()
        .AddSingleton<SuggestSteckersHandler>()
        .AddSingleton<FindRightRingHandler>()
        .AddSingleton<TakePinchHandler>()
        .AddSingleton<WriteIndicatorHandler>()
        .AddSingleton<FillInIndicatorHandler>()
        .AddSingleton<GetRingTableHandler>()
        .AddSingleton<ReadRingsHandler>();

    public static void MapBombeEndpoints(this IEndpointRouteBuilder app)
    {
        var bombe = app.MapGroup("/api/bombe");

        bombe.MapGet("/", (GetBombeStateHandler handler) =>
            handler.Handle(new GetBombeState()));

        bombe.MapPut("/cipher-text", (SetCipherText command, SetCipherTextHandler handler) =>
            handler.Handle(command));

        bombe.MapGet("/intercepts", () =>
            ListInterceptsHandler.Handle(new ListIntercepts()));

        bombe.MapPost("/source/intercept", (LoadIntercept command, LoadInterceptHandler handler) =>
            handler.Handle(command));

        bombe.MapPost("/source/exercise", (GenerateExerciseHandler handler) =>
            handler.Handle(new GenerateExercise()));

        bombe.MapGet("/source/crib", (string? type, GetSourceCribHandler handler) =>
            handler.Handle(new GetSourceCrib(type)));

        bombe.MapGet("/message-types", () =>
            ListMessageTypesHandler.Handle(new ListMessageTypes()));

        bombe.MapGet("/source/solution", (GetSolutionHandler handler) =>
            handler.Handle(new GetSolution()));

        bombe.MapPut("/crib", (SetCrib command, SetCribHandler handler) =>
            handler.Handle(command));

        bombe.MapPut("/placement", (PlacementRequest request, PlaceCribHandler handler) =>
            handler.Handle(new PlaceCrib(request.Position)));

        bombe.MapPut("/menu", (SetMenu command, SetMenuHandler handler) =>
            handler.Handle(command));

        bombe.MapPost("/menu/build", (BuildMenuHandler handler) =>
            handler.Handle(new BuildMenu()));

        bombe.MapPut("/settings", (ConfigureBombe command, ConfigureBombeHandler handler) =>
            handler.Handle(command));

        var machine = bombe.MapGroup("/machine");

        machine.MapPost("/plug-up", (PlugUpMenuHandler handler) =>
            handler.Handle(new PlugUpMenu()));

        machine.MapPut("/chains/{chain:int}/scramblers/{scrambler:int}/jacks/{jack:int}", (int chain, int scrambler, int jack, JackRequest request, PlugJackHandler handler) =>
            handler.Handle(new PlugJack(chain, scrambler, jack, request.Letter)));

        machine.MapPut("/chains/{chain:int}/rows/{row:int}", (int chain, int row, RowRequest request, FitRowHandler handler) =>
            handler.Handle(new FitRow(chain, row, request.UpTo, request.Rotor)));

        machine.MapDelete("/chains/{chain:int}/scramblers/{scrambler:int}/drums/{row:int}", (int chain, int scrambler, int row, RemoveDrumHandler handler) =>
            handler.Handle(new RemoveDrum(chain, scrambler, row)));

        machine.MapPut("/chains/{chain:int}/scramblers/{scrambler:int}/start", (int chain, int scrambler, StartRequest request, TurnScramblerHandler handler) =>
            handler.Handle(new TurnScrambler(chain, scrambler, request.Start)));

        machine.MapPut("/chains/{chain:int}/test-register", (int chain, TestRegisterRequest request, SetTestRegisterHandler handler) =>
            handler.Handle(new SetTestRegister(chain, request.Letter, request.Input)));

        machine.MapPut("/joins/{join:int}", (int join, JoinRequest request, JoinChainsHandler handler) =>
            handler.Handle(new JoinChains(join, request.Joined)));

        bombe.MapPost("/run", (RunRequest request, StartRunHandler handler) =>
            handler.Handle(new StartRun(request.Speed, request.Notebook)));

        bombe.MapPut("/run/speed", (SpeedRequest request, SetRunSpeedHandler handler) =>
            handler.Handle(new SetRunSpeed(request.Speed)));

        bombe.MapPost("/run/continue", (ContinueRunHandler handler) =>
            handler.Handle(new ContinueRun()));

        bombe.MapDelete("/run", (CancelRunHandler handler) =>
            handler.Handle(new CancelRun()));

        bombe.MapGet("/run", (GetRunHandler handler) =>
            handler.Handle(new GetRun()));

        bombe.MapGet("/printout", (int? from, int? count, GetPrintoutHandler handler) =>
            handler.Handle(new GetPrintout(from ?? 0, count)));

        bombe.MapDelete("/printout", (ClearPrintoutHandler handler) =>
            handler.Handle(new ClearPrintout()));

        bombe.MapPut("/checking", (SetCheckingMachine command, SetCheckingMachineHandler handler) =>
            handler.Handle(command));

        bombe.MapPost("/checking/press", (PressCheckingKey command, PressCheckingKeyHandler handler) =>
            handler.Handle(command));

        bombe.MapGet("/stops", (int? from, int? count, GetStopsHandler handler) =>
            handler.Handle(new GetStops(from ?? 0, count)));

        bombe.MapDelete("/stops", (ClearStopsHandler handler) =>
            handler.Handle(new ClearStops()));

        bombe.MapPost("/stops/{stop:int}/checking", (int stop, SetUpCheckingMachineHandler handler) =>
            handler.Handle(new SetUpCheckingMachine(stop)));

        bombe.MapGet("/stops/{stop:int}/check", (int stop, GetCheckHandler handler) =>
            handler.Handle(new GetCheck(stop)));

        bombe.MapPut("/stops/{stop:int}/check", (int stop, CheckRequest request, SetCheckHandler handler) =>
            handler.Handle(new SetCheck(stop, request.Steckers, request.RightRing)));

        bombe.MapPost("/stops/{stop:int}/check/verdict", (int stop, VerdictRequest request, ConfirmCheckHandler handler) =>
            handler.Handle(new ConfirmCheck(stop, request.Verdict)));

        bombe.MapPost("/stops/{stop:int}/check/suggest", (int stop, SuggestSteckersHandler handler) =>
            handler.Handle(new SuggestSteckers(stop)));

        bombe.MapPost("/stops/{stop:int}/check/find", (int stop, FindRightRingHandler handler) =>
            handler.Handle(new FindRightRing(stop)));

        bombe.MapGet("/stops/{stop:int}/check/ring-table", (int stop, GetRingTableHandler handler) =>
            handler.Handle(new GetRingTable(stop)));

        bombe.MapPut("/stops/{stop:int}/check/rings", (int stop, RingsRequest request, ReadRingsHandler handler) =>
            handler.Handle(new ReadRings(stop, request.Left, request.Middle)));

        bombe.MapPost("/pinch", (PinchRequest request, TakePinchHandler handler) =>
            handler.Handle(new TakePinch(request.SheetId, request.Day)));

        bombe.MapPut("/day/messages/{message:int}/indicator", (int message, IndicatorRequest request, WriteIndicatorHandler handler) =>
            handler.Handle(new WriteIndicator(message, request.Schluesselkenngruppe, request.Verfahrenkenngruppe)));

        bombe.MapPost("/day/messages/{message:int}/indicator/fill-in", (int message, FillInIndicatorHandler handler) =>
            handler.Handle(new FillInIndicator(message)));
    }
}
