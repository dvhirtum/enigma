using Enigma.Application.Bombe;

namespace Enigma.Api;

internal sealed record PlacementRequest(int Position);

internal sealed record SpeedRequest(double? Speed);

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
        .AddSingleton<CancelRunHandler>()
        .AddSingleton<GetRunHandler>()
        .AddSingleton<GetStopsHandler>();

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

        bombe.MapDelete("/run", (CancelRunHandler handler) =>
            handler.Handle(new CancelRun()));

        bombe.MapGet("/run", (GetRunHandler handler) =>
            handler.Handle(new GetRun()));

        bombe.MapGet("/run/stops", (int? from, GetStopsHandler handler) =>
            handler.Handle(new GetStops(from ?? 0)));
    }
}
