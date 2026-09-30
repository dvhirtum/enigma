using System.Globalization;
using Enigma.Domain.Bombe;

namespace Enigma.Application.Bombe;

/// <summary>
/// The Bombe job, with the loaded message, the copies of the menu on the machine (null without a menu), a summary of
/// its latest run and the number of stops found. Positions count from 0; crashes are crib indexes.
/// </summary>
public sealed record BombeState(
    SourceState? Source,
    string CipherText,
    string? Crib,
    IReadOnlyList<PlacementState> Placements,
    int? Position,
    MenuState? Menu,
    BombeMachineState? Machine,
    BombeSettings Settings,
    RunState? Run,
    int Stops)
{
    public static BombeState From(BombeJob job, BombeRun? run, StopLog stops)
    {
        ArgumentNullException.ThrowIfNull(job);
        ArgumentNullException.ThrowIfNull(stops);

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
            job.Menu is { } plugged
                ? new BombeMachineState(
                    plugged.ChainsPerCopy,
                    [.. job.Copies.Select(copy => new CopyState(
                        [.. copy.Drums.Select(rotor => rotor?.Name)],
                        [.. copy.Starts.Select(start => start.ToString())]))])
                : null,
            new BombeSettings(job.Input.ToString(), job.DiagonalBoard, job.Reflector.Name),
            run is null ? null : RunState.From(run, stops),
            stops.Count);
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
/// The machine plugged up with the menu: the chains (banks of 12 scramblers) one copy takes, and each copy with the
/// rotor of each row (upper, middle, lower; null when empty) and each scrambler's start letters, by menu link.
/// </summary>
public sealed record BombeMachineState(int ChainsPerCopy, IReadOnlyList<CopyState> Copies);

public sealed record CopyState(IReadOnlyList<string?> Drums, IReadOnlyList<string> Starts);

public sealed record BombeSettings(string Input, bool DiagonalBoard, string Reflector);

/// <summary>
/// A run's progress: the wheel orders of the copies tested, the positions tested of the 17,576, the letters the upper
/// drums show while it runs, the stop a paused run waits at, the stops it found and all stops found so far. Speed is in
/// positions per second, null for full speed. Error is set when the run failed.
/// </summary>
public sealed record RunState(
    string Status,
    double? Speed,
    string Reflector,
    IReadOnlyList<string> WheelOrders,
    long PositionsTested,
    long Positions,
    string? Position,
    StopState? Pause,
    int Stops,
    int AllStops,
    string? Error,
    double ElapsedSeconds)
{
    public static RunState From(BombeRun run, StopLog stops)
    {
        ArgumentNullException.ThrowIfNull(run);
        ArgumentNullException.ThrowIfNull(stops);

        var progress = run.Progress();
        return new RunState(
            progress.Status.ToString(),
            progress.Speed,
            run.Reflector.Name,
            [.. run.WheelOrders.Select(order => order.ToString())],
            progress.PositionsTested,
            DrumPosition.Count,
            progress.Position?.ToString(),
            progress is { Pause: { } pause, PauseIndex: { } index } ? StopState.From(pause, index, stops.VerdictOn(index)) : null,
            progress.Stops,
            stops.Count,
            progress.Error,
            progress.Elapsed.TotalSeconds);
    }
}

/// <summary>
/// A stop: its index among the stops found, the wheel order, the drum core positions, the indicator drum reading, the test register
/// letter, its live wires, the stecker partner they give (null when neither 1 nor 25 wires are live) and the verdict
/// of its check (Unchecked, True or False).
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

public sealed record CribState(string Crib);

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
