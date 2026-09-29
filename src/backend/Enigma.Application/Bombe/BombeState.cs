using System.Globalization;
using Enigma.Domain.Bombe;

namespace Enigma.Application.Bombe;

/// <summary>
/// The Bombe job, with the loaded message, and a summary of its latest run. Positions count from 0; crashes are crib
/// indexes.
/// </summary>
public sealed record BombeState(
    SourceState? Source,
    string CipherText,
    string? Crib,
    IReadOnlyList<PlacementState> Placements,
    int? Position,
    MenuState? Menu,
    BombeSettings Settings,
    RunState? Run)
{
    public static BombeState From(BombeJob job, BombeRun? run)
    {
        ArgumentNullException.ThrowIfNull(job);

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
            new BombeSettings(
                job.Input.ToString(),
                job.DiagonalBoard,
                job.Reflector.Name,
                [.. job.WheelOrders.Select(order => order.ToString())]),
            run is null ? null : RunState.From(run));
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

public sealed record BombeSettings(string Input, bool DiagonalBoard, string Reflector, IReadOnlyList<string> WheelOrders);

/// <summary>
/// A run's progress. Speed is in positions per second, null for full speed. Error is set when the run failed. The
/// wheel order and drum position in hand are shown while the run is paced.
/// </summary>
public sealed record RunState(
    string Status,
    double? Speed,
    string Reflector,
    int WheelOrders,
    int WheelOrdersDone,
    long PositionsTested,
    long Positions,
    string? WheelOrder,
    string? Position,
    int Stops,
    string? Error,
    double ElapsedSeconds)
{
    public static RunState From(BombeRun run)
    {
        ArgumentNullException.ThrowIfNull(run);

        var progress = run.Progress();
        return new RunState(
            progress.Status.ToString(),
            progress.Speed,
            run.Reflector.Name,
            run.WheelOrders.Count,
            progress.WheelOrdersDone,
            progress.PositionsTested,
            (long)run.WheelOrders.Count * DrumPosition.Count,
            progress.WheelOrder?.ToString(),
            progress.Position?.ToString(),
            progress.Stops,
            progress.Error,
            progress.Elapsed.TotalSeconds);
    }
}

/// <summary>
/// A stop: the wheel order, the drum core positions, the indicator drum reading, the test register letter, its live
/// wires and the stecker partner they give (null when neither 1 nor 25 wires are live).
/// </summary>
public sealed record StopState(
    string WheelOrder,
    string Position,
    string Indicator,
    string TestRegister,
    string LiveWires,
    string? Stecker)
{
    public static StopState From(BombeStop stop)
    {
        ArgumentNullException.ThrowIfNull(stop);

        return new StopState(
            stop.WheelOrder.ToString(),
            stop.Position.ToString(),
            stop.Position.Indicator.ToString(),
            stop.TestRegister.ToString(),
            string.Concat(stop.LiveWires),
            stop.Stecker?.ToString());
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
