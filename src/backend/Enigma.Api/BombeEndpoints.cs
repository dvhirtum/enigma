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

internal sealed record CheckRequest(string? Steckers, int? RightRing, int? MiddleRing);

internal sealed record VerdictRequest(string? Verdict);

internal sealed record PinchRequest(string? SheetId, int? Day);

internal sealed record IndicatorRequest(string? Schluesselkenngruppe, string? Verfahrenkenngruppe);

internal sealed record RingsRequest(int? Left, int? Middle);

internal static class BombeEndpoints
{
    public static IServiceCollection AddBombeHandlers(this IServiceCollection services)
    {
        return services
            .AddSingleton<GetBombeStateHandler>()
            .AddSingleton<SetCipherTextHandler>()
            .AddSingleton<LoadInterceptHandler>()
            .AddSingleton<GenerateExerciseHandler>()
            .AddSingleton<GetSourceCribHandler>()
            .AddSingleton<GetSolutionHandler>()
            .AddSingleton<ShowWheelOrdersHandler>()
            .AddSingleton<ShowCribPositionsHandler>()
            .AddSingleton<SetCribHandler>()
            .AddSingleton<PlaceCribHandler>()
            .AddSingleton<SetMenuHandler>()
            .AddSingleton<BuildMenuHandler>()
            .AddSingleton<GetMenuStopsHandler>()
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
            .AddSingleton<FindMiddleRingHandler>()
            .AddSingleton<TakePinchHandler>()
            .AddSingleton<WriteIndicatorHandler>()
            .AddSingleton<FillInIndicatorHandler>()
            .AddSingleton<GetRingTableHandler>()
            .AddSingleton<ReadRingsHandler>();
    }

    public static void MapBombeEndpoints(this IEndpointRouteBuilder app)
    {
        var bombe = app.MapGroup("/api/bombe")
            .ProducesProblem(StatusCodes.Status400BadRequest);
        var job = bombe.MapGroup("").WithTags("Bombe job");
        var machine = bombe.MapGroup("/machine").WithTags("Bombe machine");
        var run = bombe.MapGroup("").WithTags("Bombe run");
        var checking = bombe.MapGroup("").WithTags("Checking");
        var day = bombe.MapGroup("/day").WithTags("Day traffic");

        job.MapGet("/", (GetBombeStateHandler handler) =>
                handler.Handle(new GetBombeState()))
            .WithSummary("Gets the job: message, crib, menu, settings and machines.");

        job.MapPut("/cipher-text", (SetCipherText command, SetCipherTextHandler handler) =>
                handler.Handle(command))
            .WithSummary("Loads pasted text as the message: a radio message or bare cipher text; empty clears it.");

        job.MapGet("/intercepts", () =>
                ListInterceptsHandler.Handle(new ListIntercepts()))
            .WithSummary("Lists the historical intercepts.");

        job.MapPost("/source/intercept", (LoadIntercept command, LoadInterceptHandler handler) =>
                handler.Handle(command))
            .WithSummary("Loads a historical intercept as the message.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        job.MapPost("/source/exercise", (GenerateExerciseHandler handler) =>
                handler.Handle(new GenerateExercise()))
            .WithSummary("Generates an exercise from a day of the M3 key sheets and loads it.");

        job.MapGet("/source/crib", (string? type, GetSourceCribHandler handler) =>
                handler.Handle(new GetSourceCrib(type)))
            .WithSummary("Gets the likely crib of the message, or of a message type.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        job.MapGet("/message-types", () =>
                ListMessageTypesHandler.Handle(new ListMessageTypes()))
            .WithSummary("Lists the message types and their cribs.");

        job.MapGet("/source/solution", (GetSolutionHandler handler) =>
                handler.Handle(new GetSolution()))
            .WithSummary("Gets the solution of an intercept or exercise.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        job.MapPost("/source/wheel-orders", (ShowWheelOrdersHandler handler) =>
                handler.Handle(new ShowWheelOrders()))
            .WithSummary("Shows three wheel orders, one of them the key's.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        job.MapPost("/source/crib-positions", (ShowCribPositionsHandler handler) =>
                handler.Handle(new ShowCribPositions()))
            .WithSummary("Shows two crib positions of an exercise, one of them the crib's.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        job.MapPut("/crib", (SetCrib command, SetCribHandler handler) =>
                handler.Handle(command))
            .WithSummary("Sets the crib.");

        job.MapPut("/placement", (PlacementRequest request, PlaceCribHandler handler) =>
                handler.Handle(new PlaceCrib(request.Position)))
            .WithSummary("Places the crib at a position and builds the menu; crashes are rejected.");

        job.MapPut("/menu", (SetMenu command, SetMenuHandler handler) =>
                handler.Handle(command))
            .WithSummary("Sets the menu by hand from links of the placed crib.");

        job.MapPost("/menu/build", (BuildMenuHandler handler) =>
                handler.Handle(new BuildMenu()))
            .WithSummary("Builds the menu from the placed crib.");

        job.MapGet("/menu/stops", (GetMenuStopsHandler handler) =>
                handler.Handle(new GetMenuStops()))
            .WithSummary("Measures the menu's stops per wheel order, with and without the diagonal board.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        job.MapPut("/settings", (ConfigureBombe command, ConfigureBombeHandler handler) =>
                handler.Handle(command))
            .WithSummary("Sets the diagonal board and the reflector; left out: unchanged.");

        machine.MapPost("/plug-up", (PlugUpMenuHandler handler) =>
                handler.Handle(new PlugUpMenu()))
            .WithSummary("Plugs up the Bombe with the menu.");

        machine.MapPut("/chains/{chain:int}/scramblers/{scrambler:int}/jacks/{jack:int}",
                (int chain, int scrambler, int jack, JackRequest request, PlugJackHandler handler) =>
                    handler.Handle(new PlugJack(chain, scrambler, jack, request.Letter)))
            .WithSummary("Cables a scrambler jack to a letter; empty unplugs it.");

        machine.MapPut("/chains/{chain:int}/rows/{row:int}",
                (int chain, int row, RowRequest request, FitRowHandler handler) =>
                    handler.Handle(new FitRow(chain, row, request.UpTo, request.Rotor)))
            .WithSummary("Fits a drum row of a chain with a rotor, from scrambler 1 up to a scrambler.");

        machine.MapDelete("/chains/{chain:int}/scramblers/{scrambler:int}/drums/{row:int}",
                (int chain, int scrambler, int row, RemoveDrumHandler handler) =>
                    handler.Handle(new RemoveDrum(chain, scrambler, row)))
            .WithSummary("Takes one drum out.");

        machine.MapPut("/chains/{chain:int}/scramblers/{scrambler:int}/start",
                (int chain, int scrambler, StartRequest request, TurnScramblerHandler handler) =>
                    handler.Handle(new TurnScrambler(chain, scrambler, request.Start)))
            .WithSummary("Turns a scrambler's drums to start letters, such as ZZB.");

        machine.MapPut("/chains/{chain:int}/test-register",
                (int chain, TestRegisterRequest request, SetTestRegisterHandler handler) =>
                    handler.Handle(new SetTestRegister(chain, request.Letter, request.Input)))
            .WithSummary("Plugs a chain's test register and sets its input wire; left out: unchanged, empty: unplugged or default.");

        machine.MapPut("/joins/{join:int}", (int join, JoinRequest request, JoinChainsHandler handler) =>
                handler.Handle(new JoinChains(join, request.Joined)))
            .WithSummary("Joins or separates two chains.");

        run.MapPost("/run", (RunRequest request, StartRunHandler handler) =>
                handler.Handle(new StartRun(request.Speed, request.Notebook)))
            .WithSummary("Starts a run at a speed in positions per second, or at full speed.");

        run.MapPut("/run/speed", (SpeedRequest request, SetRunSpeedHandler handler) =>
                handler.Handle(new SetRunSpeed(request.Speed)))
            .WithSummary("Changes the speed of the run.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        run.MapPost("/run/continue", (ContinueRunHandler handler) =>
                handler.Handle(new ContinueRun()))
            .WithSummary("Continues a run paused at a stop.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        run.MapDelete("/run", (CancelRunHandler handler) =>
                handler.Handle(new CancelRun()))
            .WithSummary("Stops the run.");

        run.MapGet("/run", (GetRunHandler handler) =>
                handler.Handle(new GetRun()))
            .WithSummary("Gets the run's progress.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        run.MapGet("/printout", (int? from, int? count, GetPrintoutHandler handler) =>
                handler.Handle(new GetPrintout(from ?? 0, count)))
            .WithSummary("Gets the printed stops from an index on; count left out: all.");

        run.MapDelete("/printout", (ClearPrintoutHandler handler) =>
                handler.Handle(new ClearPrintout()))
            .WithSummary("Clears the printout.");

        run.MapGet("/stops", (int? from, int? count, GetStopsHandler handler) =>
                handler.Handle(new GetStops(from ?? 0, count)))
            .WithSummary("Gets the stops logged for the notebook from an index on, with their verdicts; count left out: all.");

        run.MapDelete("/stops", (ClearStopsHandler handler) =>
                handler.Handle(new ClearStops()))
            .WithSummary("Clears the logged stops and their checks.");

        checking.MapPut("/checking", (SetCheckingMachine command, SetCheckingMachineHandler handler) =>
                handler.Handle(command))
            .WithSummary("Sets the checking machine's reflector, drums, rings and windows; left out: unchanged.");

        checking.MapPost("/checking/press", (PressCheckingKey command, PressCheckingKeyHandler handler) =>
                handler.Handle(command))
            .WithSummary("Presses a key on the checking machine; gives the lamp and, when set up for a stop, its check.");

        checking.MapPost("/stops/{stop:int}/checking", (int stop, SetUpCheckingMachineHandler handler) =>
                handler.Handle(new SetUpCheckingMachine(stop)))
            .WithSummary("Sets up the checking machine for a stop.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        checking.MapGet("/stops/{stop:int}/check", (int stop, GetCheckHandler handler) =>
                handler.Handle(new GetCheck(stop)))
            .WithSummary("Gets the check of a stop, starting it when first asked for.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        checking.MapPut("/stops/{stop:int}/check", (int stop, CheckRequest request, SetCheckHandler handler) =>
                handler.Handle(new SetCheck(stop, request.Steckers, request.RightRing, request.MiddleRing)))
            .WithSummary("Sets the stecker sheet and the right and middle rings; left out: unchanged.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        checking.MapPost("/stops/{stop:int}/check/verdict",
                (int stop, VerdictRequest request, ConfirmCheckHandler handler) =>
                    handler.Handle(new ConfirmCheck(stop, request.Verdict)))
            .WithSummary("Records the verdict (True, False or Unchecked) and compares it with the solution.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        checking.MapPost("/stops/{stop:int}/check/suggest", (int stop, SuggestSteckersHandler handler) =>
                handler.Handle(new SuggestSteckers(stop)))
            .WithSummary("Suggests steckers for the letters not on the sheet, without setting them.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        checking.MapPost("/stops/{stop:int}/check/find", (int stop, FindRightRingHandler handler) =>
                handler.Handle(new FindRightRing(stop)))
            .WithSummary("Scores every right ring and sets the best.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        checking.MapPost("/stops/{stop:int}/check/find-middle", (int stop, FindMiddleRingHandler handler) =>
                handler.Handle(new FindMiddleRing(stop)))
            .WithSummary("Scores every middle ring and sets the best.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        checking.MapGet("/stops/{stop:int}/check/ring-table", (int stop, GetRingTableHandler handler) =>
                handler.Handle(new GetRingTable(stop)))
            .WithSummary("Gets the 676 left and middle rings with the cores each leads to at the crib.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        checking.MapPut("/stops/{stop:int}/check/rings", (int stop, RingsRequest request, ReadRingsHandler handler) =>
                handler.Handle(new ReadRings(stop, request.Left, request.Middle)))
            .WithSummary("Reads the left and middle rings (1–26) off the ring table; both left out: forgets them.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        bombe.MapPost("/pinch", (PinchRequest request, TakePinchHandler handler) =>
                handler.Handle(new TakePinch(request.SheetId, request.Day)))
            .WithTags("Day traffic")
            .WithSummary("Takes a pinch of the key sheet day and gives the day's other messages.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        day.MapPut("/messages/{message:int}/indicator",
                (int message, IndicatorRequest request, WriteIndicatorHandler handler) =>
                    handler.Handle(new WriteIndicator(message, request.Schluesselkenngruppe,
                        request.Verfahrenkenngruppe)))
            .WithSummary("Writes down a message's Kenngruppen; left out: unchanged, empty: rubbed out; 0 is the broken message.");

        day.MapPost("/messages/{message:int}/indicator/fill-in", (int message, FillInIndicatorHandler handler) =>
                handler.Handle(new FillInIndicator(message)))
            .WithSummary("Fills in a message's Kenngruppen from the bigram table.");
    }
}
