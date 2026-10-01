using System.Globalization;
using Enigma.Domain.Bombe;

namespace Enigma.Application.Bombe;

/// <summary>
/// The Bombe job, with the loaded message, the menu, the Bombe and the checking machine as set up, the run settings, a
/// summary of its latest run, the number of stops logged for the notebook and the number printed, and the day's traffic
/// once a pinch is taken (null before). Positions count from 0; crashes are crib indexes.
/// </summary>
public sealed record BombeState(
    SourceState? Source,
    string CipherText,
    string? Crib,
    IReadOnlyList<PlacementState> Placements,
    int? Position,
    MenuState? Menu,
    BombeMachineState Machine,
    CheckingMachineState Checker,
    BombeSettings Settings,
    RunState? Run,
    int Stops,
    int Printed,
    DayState? Day)
{
    public static BombeState From(BombeJob job, BombeRun? run, IBombeSessionStore store)
    {
        ArgumentNullException.ThrowIfNull(job);
        ArgumentNullException.ThrowIfNull(store);

        return new BombeState(
            job.Source is null ? null : SourceState.From(job.Source),
            string.Concat(job.CipherText),
            job.Crib?.ToString(),
            [.. job.Placements.Select(p => new PlacementState(p.Position, p.Crashes))],
            job.Placement?.Position,
            job is { Menu: { } menu, Placement: { } placement }
                ? new MenuState(
                    [.. menu.Links.Select(link => link.ToString())],
                    [.. placement.Links.Select(link => link.ToString())],
                    menu.TestRegister.ToString(),
                    [.. menu.ConnectedLinks.Select(link => link.ToString())],
                    menu.Loops,
                    menu.EstimatedStops(diagonalBoard: true),
                    menu.EstimatedStops(diagonalBoard: false))
                : null,
            BombeMachineState.From(job),
            CheckingMachineState.From(job.Checker, store.Stops),
            new BombeSettings(job.DiagonalBoard, job.Reflector.Name),
            run is null ? null : RunState.From(run, store),
            store.Stops.Count,
            store.Printout.Count,
            job.Traffic is null ? null : DayState.From(job.Traffic));
    }
}

public sealed record PlacementState(int Position, IReadOnlyList<int> Crashes);

/// <summary>
/// The menu links (letters, then offset), every link of the placed crib, the test register, the links connected to it,
/// their loops and the estimated false stops per wheel order with and without the diagonal board.
/// </summary>
public sealed record MenuState(
    IReadOnlyList<string> Links,
    IReadOnlyList<string> CribLinks,
    string TestRegister,
    IReadOnlyList<string> ConnectedLinks,
    int Loops,
    double StopsWithBoard,
    double StopsWithoutBoard);

/// <summary>
/// The Bombe as set up: its three chains, whether each chain is joined to the next, whether it is plugged up with the
/// job's menu, whether it was plugged by hand (cables that no menu plugged), and what a run will not use.
/// </summary>
public sealed record BombeMachineState(
    IReadOnlyList<ChainState> Chains,
    IReadOnlyList<bool> Joins,
    bool PluggedForMenu,
    bool PluggedByHand,
    IReadOnlyList<string> Warnings)
{
    public static BombeMachineState From(BombeJob job)
    {
        ArgumentNullException.ThrowIfNull(job);

        var machine = job.Machine;
        return new BombeMachineState(
            [.. machine.ChainSetups.Select(chain => new ChainState(
                chain.TestRegister?.ToString(),
                chain.Input.ToString(),
                [.. chain.Scramblers.Select(scrambler => new ScramblerState(
                    [.. scrambler.Cables.Select(letter => letter?.ToString())],
                    [.. scrambler.Rotors.Select(rotor => rotor?.Name)],
                    scrambler.Start.ToString()))]))],
            [.. machine.Joins],
            job.Menu is not null && ReferenceEquals(machine.PluggedMenu, job.Menu),
            machine.PluggedMenu is null && machine.ChainSetups.Any(chain =>
                chain.TestRegister is not null || chain.Scramblers.Any(scrambler => scrambler.HasCable)),
            machine.Warnings());
    }
}

/// <summary>A chain: the letter its test register is plugged onto (null: none), its input wire, and its 12 scramblers.</summary>
public sealed record ChainState(string? TestRegister, string Input, IReadOnlyList<ScramblerState> Scramblers);

/// <summary>A scrambler: the letters its two jacks are cabled to, its drums' rotors (upper, middle, lower) and start letters.</summary>
public sealed record ScramblerState(IReadOnlyList<string?> Jacks, IReadOnlyList<string?> Drums, string Start);

/// <summary>
/// The checking machine: reflector cartridge (null: none), whether the dummy drum is fitted, rotor of each drum left to
/// right (null: none), ring and window letters, and the logged stop it was set up for (null when set by hand).
/// </summary>
public sealed record CheckingMachineState(string? Reflector, bool Dummy, IReadOnlyList<string?> Drums, string Rings, string Windows, StopState? Stop)
{
    public static CheckingMachineState From(CheckingMachine checker, StopLog stops)
    {
        ArgumentNullException.ThrowIfNull(checker);
        ArgumentNullException.ThrowIfNull(stops);

        var stop = checker.Stop is { } index && stops.Stops(index, 1) is [{ } found]
            ? StopState.From(found, index, stops.VerdictOn(index))
            : null;
        return new CheckingMachineState(
            checker.Reflector?.Name,
            checker.Dummy,
            [.. checker.Drums.Select(rotor => rotor?.Name)],
            checker.Rings.ToString(),
            checker.Windows.ToString(),
            stop);
    }
}

public sealed record BombeSettings(bool DiagonalBoard, string Reflector);

/// <summary>
/// A run's progress: the groups of chains tested, whether the stops are logged for the notebook, the positions tested
/// of the 17,576, the letters the upper drums show while it runs, the stop a paused run waits at, the stops it found,
/// all stops logged and all printed so far. Speed is in positions per second, null for full speed. Error is set when
/// the run failed.
/// </summary>
public sealed record RunState(
    string Status,
    double? Speed,
    string Reflector,
    IReadOnlyList<RunGroupState> Groups,
    bool Logged,
    long PositionsTested,
    long Positions,
    string? Position,
    PrintedStopState? Pause,
    int Stops,
    int AllStops,
    int Printed,
    string? Error,
    double ElapsedSeconds)
{
    public static RunState From(BombeRun run, IBombeSessionStore store)
    {
        ArgumentNullException.ThrowIfNull(run);
        ArgumentNullException.ThrowIfNull(store);

        var progress = run.Progress();
        return new RunState(
            progress.Status.ToString(),
            progress.Speed,
            run.Reflector.Name,
            [.. run.Groups.Select(group => new RunGroupState(
                [.. group.Chains], group.WheelOrder?.ToString(), group.TestRegister?.ToString() ?? string.Empty, group.Input.ToString()))],
            run.Logged,
            progress.PositionsTested,
            DrumPosition.Count,
            progress.Position?.ToString(),
            progress is { Pause: { } pause, PauseIndex: { } index } ? PrintedStopState.From(pause, index) : null,
            progress.Stops,
            store.Stops.Count,
            store.Printout.Count,
            progress.Error,
            progress.Elapsed.TotalSeconds);
    }
}

/// <summary>A group of chains a run tests (0 = chain 1), its wheel order (null when a row is empty), test register and input.</summary>
public sealed record RunGroupState(IReadOnlyList<int> Chains, string? WheelOrder, string TestRegister, string Input);

/// <summary>
/// A printed stop: its index on the printout, the chains (0 = chain 1), their wheel order (null when a row is empty),
/// the upper drums' letters, the indicator drum reading, the test register letter, its live wires and the stecker
/// partner they give (null when neither 1 nor 25 wires are live).
/// </summary>
public sealed record PrintedStopState(
    int Index,
    IReadOnlyList<int> Chains,
    string? WheelOrder,
    string DrumLetters,
    string Indicator,
    string TestRegister,
    string LiveWires,
    string? Stecker)
{
    public static PrintedStopState From(PrintedStop stop, int index)
    {
        ArgumentNullException.ThrowIfNull(stop);

        return new PrintedStopState(
            index,
            [.. stop.Chains],
            stop.WheelOrder?.ToString(),
            stop.DrumLetters.ToString(),
            stop.Indicator.ToString(),
            stop.TestRegister.ToString(),
            string.Concat(stop.LiveWires),
            stop.Stecker?.ToString());
    }
}

/// <summary>
/// A logged stop: its index among the stops logged, the wheel order, the drum core positions, the indicator drum
/// reading, the test register letter, its live wires, the stecker partner they give (null when neither 1 nor 25 wires
/// are live) and the verdict of its check (Unchecked, True or False).
/// </summary>
public sealed record StopState(
    int Index,
    string WheelOrder,
    string Position,
    string Indicator,
    string TestRegister,
    string LiveWires,
    string? Stecker,
    string Verdict)
{
    public static StopState From(BombeStop stop, int index, StopVerdict verdict)
    {
        ArgumentNullException.ThrowIfNull(stop);

        return new StopState(
            index,
            stop.WheelOrder.ToString(),
            stop.Position.ToString(),
            stop.Indicator.ToString(),
            stop.TestRegister.ToString(),
            string.Concat(stop.LiveWires),
            stop.Stecker?.ToString(),
            verdict.ToString());
    }
}

/// <summary>
/// The loaded message: its kind (Intercept, Exercise or Pasted), title, hint, transcript as received, the Navy radio
/// message when it is one, and whether a crib and a solution can be asked for.
/// </summary>
public sealed record SourceState(
    string Kind,
    string Title,
    string? Hint,
    string Transcript,
    string? Message,
    bool HasCrib,
    bool HasSolution)
{
    public static SourceState From(MessageSource source)
    {
        ArgumentNullException.ThrowIfNull(source);

        return new SourceState(
            source.Kind.ToString(),
            source.Title,
            source.Hint,
            source.Transcript,
            source.Message?.ToString(),
            source.Crib is not null,
            source.Solution is not null);
    }
}

/// <summary>A bundled intercept. The date is yyyy-MM-dd, or null when unknown.</summary>
public sealed record InterceptState(string Id, string Title, string? Date, string? Hint)
{
    public static InterceptState From(Intercept intercept)
    {
        ArgumentNullException.ThrowIfNull(intercept);

        return new InterceptState(
            intercept.Id,
            intercept.Source.Title,
            intercept.Date?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            intercept.Source.Hint);
    }
}

/// <summary>A suggested crib and where in the message it is likely to stand (empty when unknown).</summary>
public sealed record CribState(string Crib, string Place);

/// <summary>A kind of stereotyped message to suggest a crib for: its id and name.</summary>
public sealed record MessageTypeState(string Id, string Name);

/// <summary>
/// How the loaded message was encrypted: reflector, wheel order, ring settings (1–26), plug pairs, the rotor positions
/// the cipher text starts from, the plain text and notes. Exercises also give their key sheet day and indicator.
/// </summary>
public sealed record SolutionState(
    string Reflector,
    string WheelOrder,
    IReadOnlyList<int> Rings,
    IReadOnlyList<string> Plugs,
    string MessageKey,
    string Plaintext,
    string Notes,
    ExerciseState? Exercise)
{
    public static SolutionState From(Solution solution)
    {
        ArgumentNullException.ThrowIfNull(solution);

        return new SolutionState(
            solution.Reflector.Name,
            solution.WheelOrder.ToString(),
            [.. solution.Rings.Select(ring => ring.Number)],
            [.. solution.Plugs.Select(plug => plug.ToString())],
            solution.MessageKey.ToString(),
            solution.Plaintext,
            solution.Notes,
            solution.Exercise is { } exercise
                ? new ExerciseState(
                    exercise.SheetId,
                    exercise.Network,
                    exercise.Month.ToString(),
                    exercise.Day,
                    exercise.Grundstellung.ToString(),
                    exercise.Indicator.Schluesselkenngruppe.ToString(),
                    exercise.Indicator.Verfahrenkenngruppe.ToString())
                : null);
    }
}

public sealed record ExerciseState(
    string SheetId,
    string Network,
    string Month,
    int Day,
    string Grundstellung,
    string Schluesselkenngruppe,
    string Verfahrenkenngruppe);

/// <summary>
/// The day's traffic read with a pinch: the key sheet, network, month and day, the Grundstellung, the bigram table in
/// force (its number and swaps such as "ABCD": AB and CD swap), and the messages of the day, the broken one first.
/// </summary>
public sealed record DayState(
    string SheetId,
    string Network,
    string Month,
    int Day,
    string Grundstellung,
    int Table,
    IReadOnlyList<string> Swaps,
    IReadOnlyList<DayMessageState> Messages)
{
    public static DayState From(DayTraffic traffic)
    {
        ArgumentNullException.ThrowIfNull(traffic);

        var pinch = traffic.Pinch;
        return new DayState(
            pinch.SheetId,
            pinch.Network,
            pinch.Month.ToString(),
            pinch.Day,
            pinch.Grundstellung.ToString(),
            pinch.Table.Number,
            [.. pinch.Table.Swaps.Select(swap => $"{swap.A}{swap.B}")],
            [.. traffic.Messages.Select((message, index) =>
            {
                var indicator = traffic.IndicatorOf(index);
                return new DayMessageState(
                    message.Message.ToString(),
                    message.Message.Indicator.ToString(),
                    message.Schluesselkenngruppe?.ToString(),
                    message.Schluesselkenngruppe is { } schluessel ? schluessel == indicator.Schluesselkenngruppe : null,
                    message.Verfahrenkenngruppe?.ToString(),
                    message.Verfahrenkenngruppe is { } verfahren ? verfahren == indicator.Verfahrenkenngruppe : null);
            })]);
    }
}

/// <summary>
/// A message of the day: the radio message, its indicator groups, and the Schlüsselkenngruppe and Verfahrenkenngruppe
/// written down (null: not yet), each with whether it is what the bigram table gives (null: not written).
/// </summary>
public sealed record DayMessageState(
    string Message,
    string Indicator,
    string? Schluesselkenngruppe,
    bool? SchluesselkenngruppeRight,
    string? Verfahrenkenngruppe,
    bool? VerfahrenkenngruppeRight);

/// <summary>
/// The ring table of a stop's check: the Grundstellung and Verfahrenkenngruppe it is worked with, the right ring, the
/// stop's core positions at the start of the crib, and a row for each of the 676 left and middle rings.
/// </summary>
public sealed record RingTableState(string Grundstellung, string Verfahrenkenngruppe, int RightRing, string Cores, IReadOnlyList<RingRowState> Rows);

/// <summary>A row of the ring table: left and middle rings (1–26), the Spruchschlüssel they give and the cores it leads to at the crib.</summary>
public sealed record RingRowState(int Left, int Middle, string Spruchschluessel, string Cores);
