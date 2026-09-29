using Enigma.Domain.Bombe;

namespace Enigma.Application.Bombe;

/// <summary>The Bombe job and a summary of its latest run. Positions count from 0; crashes are crib indexes.</summary>
public sealed record BombeState(
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
            string.Concat(job.CipherText),
            job.Crib?.ToString(),
            [.. job.Placements.Select(p => new PlacementState(p.Position, p.Crashes))],
            job.Placement?.Position,
            job.Menu is { } menu
                ? new MenuState(
                    [.. menu.Links.Select(link => link.ToString())],
                    menu.TestRegister.ToString(),
                    menu.Loops,
                    menu.EstimatedStops(job.DiagonalBoard))
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

/// <summary>The menu links (letters, then offset), the test register, loops and estimated stops per wheel order.</summary>
public sealed record MenuState(IReadOnlyList<string> Links, string TestRegister, int Loops, double EstimatedStops);

public sealed record BombeSettings(string Input, bool DiagonalBoard, string Reflector, IReadOnlyList<string> WheelOrders);

/// <summary>
/// A run's progress. Speed is in positions per second, null for full speed. The wheel order and drum position in
/// hand are shown while the run is paced.
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
