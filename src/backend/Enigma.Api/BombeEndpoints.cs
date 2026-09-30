using Enigma.Application.Bombe;

namespace Enigma.Api;

internal sealed record PlacementRequest(int Position);

internal sealed record SpeedRequest(double? Speed);

internal sealed record CheckRequest(string? Position, string? Steckers, int? RightRing);

internal sealed record KeyRequest(string? Key);

internal sealed record VerdictRequest(string? Verdict);

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
        .AddSingleton<ConfigureBombeHandler>()
        .AddSingleton<StartRunHandler>()
        .AddSingleton<SetRunSpeedHandler>()
        .AddSingleton<ContinueRunHandler>()
        .AddSingleton<CancelRunHandler>()
        .AddSingleton<GetRunHandler>()
        .AddSingleton<GetStopsHandler>()
        .AddSingleton<GetCheckHandler>()
        .AddSingleton<SetCheckHandler>()
        .AddSingleton<PressCheckKeyHandler>()
        .AddSingleton<ConfirmCheckHandler>()
        .AddSingleton<SuggestSteckersHandler>()
        .AddSingleton<FindRightRingHandler>();

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

        bombe.MapGet("/source/crib", (GetSourceCribHandler handler) =>
            handler.Handle(new GetSourceCrib()));

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

        bombe.MapPost("/run", (SpeedRequest request, StartRunHandler handler) =>
            handler.Handle(new StartRun(request.Speed)));

        bombe.MapPut("/run/speed", (SpeedRequest request, SetRunSpeedHandler handler) =>
            handler.Handle(new SetRunSpeed(request.Speed)));

        bombe.MapPost("/run/continue", (ContinueRunHandler handler) =>
            handler.Handle(new ContinueRun()));

        bombe.MapDelete("/run", (CancelRunHandler handler) =>
            handler.Handle(new CancelRun()));

        bombe.MapGet("/run", (GetRunHandler handler) =>
            handler.Handle(new GetRun()));

        bombe.MapGet("/run/stops", (int? from, GetStopsHandler handler) =>
            handler.Handle(new GetStops(from ?? 0)));

        bombe.MapGet("/run/stops/{stop:int}/check", (int stop, GetCheckHandler handler) =>
            handler.Handle(new GetCheck(stop)));

        bombe.MapPut("/run/stops/{stop:int}/check", (int stop, CheckRequest request, SetCheckHandler handler) =>
            handler.Handle(new SetCheck(stop, request.Position, request.Steckers, request.RightRing)));

        bombe.MapPost("/run/stops/{stop:int}/check/press", (int stop, KeyRequest request, PressCheckKeyHandler handler) =>
            handler.Handle(new PressCheckKey(stop, request.Key)));

        bombe.MapPost("/run/stops/{stop:int}/check/verdict", (int stop, VerdictRequest request, ConfirmCheckHandler handler) =>
            handler.Handle(new ConfirmCheck(stop, request.Verdict)));

        bombe.MapPost("/run/stops/{stop:int}/check/suggest", (int stop, SuggestSteckersHandler handler) =>
            handler.Handle(new SuggestSteckers(stop)));

        bombe.MapPost("/run/stops/{stop:int}/check/find", (int stop, FindRightRingHandler handler) =>
            handler.Handle(new FindRightRing(stop)));
    }
}
