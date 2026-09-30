using Enigma.Application.Procedure;
using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Application.Bombe;

public enum RunStatus
{
    Running,
    Paused,
    Finished,
    Cancelled,
    Failed,
}

/// <summary>
/// A Bombe run in the background: the drums turn once through all 17,576 positions, and at each one every group of
/// chains with a test register is tested with its scramblers as set up. At full speed (null) the groups are tested in
/// parallel; at a set speed (positions per second) the run is paced by the clock and pauses at each stop until it is
/// continued. The speed can change while the run goes. The stops are printed, and, for the Hut 8 notebook, logged with
/// the placed crib.
/// </summary>
public sealed class BombeRun
{
    /// <summary>The speed of a real Bombe: a run in about 20 minutes.</summary>
    public const double HistoricalSpeed = DrumPosition.Count / (20 * 60.0);

    // The positions tested at full speed between looks at the speed and the cancel flag.
    private const int FullSpeedChunk = Letter.Count * Letter.Count;

    private static readonly TimeSpan Tick = TimeSpan.FromMilliseconds(20);

    private readonly Lock _lock = new();
    private readonly GroupMachine[] _machines;
    private readonly Printout _printout;
    private readonly StopLog? _log;
    private readonly CribPlacement? _placement;
    private readonly Solution? _solution;
    private readonly TimeProvider _time;
    private readonly long _started;
    private volatile bool _cancelled;
    private double? _speed;
    private int _step;
    private int _stops;
    private (PrintedStop Stop, int Index)? _pause;
    private long? _ended;
    private RunStatus _status = RunStatus.Running;
    private string? _error;

    private BombeRun(BombeJob job, double? speed, TimeProvider time, Printout printout, StopLog? log)
    {
        _machines = [.. job.Machine.Machines(job.Reflector, job.DiagonalBoard)];
        Groups = [.. _machines.Select(machine => machine.Group)];
        Reflector = job.Reflector;
        _printout = printout;
        _placement = job.Placement;
        _log = _placement is null ? null : log;
        _solution = job.Source?.Solution;
        _speed = CheckSpeed(speed);
        _time = time;
        _started = time.GetTimestamp();
        Completion = Task.Run(RunAsync);
    }

    /// <summary>The groups of chains tested, in order.</summary>
    public IReadOnlyList<ChainGroup> Groups { get; }

    public ReflectorType Reflector { get; }

    /// <summary>Whether the stops go to the Hut 8 notebook's stop log too.</summary>
    public bool Logged => _log is not null;

    /// <summary>Completes when the run has finished, was cancelled or failed.</summary>
    public Task Completion { get; }

    public double? Speed
    {
        get
        {
            lock (_lock)
            {
                return _speed;
            }
        }

        set
        {
            var speed = CheckSpeed(value);
            lock (_lock)
            {
                _speed = speed;
            }
        }
    }

    public RunStatus Status
    {
        get
        {
            lock (_lock)
            {
                return CurrentStatus;
            }
        }
    }

    /// <summary>Running or paused.</summary>
    public bool IsActive => Status is RunStatus.Running or RunStatus.Paused;

    private RunStatus CurrentStatus => _status == RunStatus.Running && _pause is not null ? RunStatus.Paused : _status;

    private bool IsPaused
    {
        get
        {
            lock (_lock)
            {
                return _pause is not null;
            }
        }
    }

    /// <summary>
    /// Starts running the Bombe as set up. With a stop log (the Hut 8 notebook is open) and a placed crib, the stops
    /// are logged for checking too.
    /// </summary>
    public static BombeRun Start(BombeJob job, double? speed, TimeProvider time, Printout printout, StopLog? log)
    {
        ArgumentNullException.ThrowIfNull(job);
        ArgumentNullException.ThrowIfNull(time);
        ArgumentNullException.ThrowIfNull(printout);

        return new BombeRun(job, speed, time, printout, log);
    }

    public void Cancel() => _cancelled = true;

    /// <summary>Continues a run paused at a stop.</summary>
    public void Continue()
    {
        lock (_lock)
        {
            _pause = CurrentStatus == RunStatus.Paused
                ? null
                : throw new DomainException("The Bombe is not paused at a stop.");
        }
    }

    public RunProgress Progress()
    {
        lock (_lock)
        {
            return new RunProgress(
                CurrentStatus,
                _speed,
                _step,
                _status == RunStatus.Running ? BombeMachine.PositionAt(Math.Min(_step, DrumPosition.Count - 1)) : null,
                _pause?.Stop,
                _pause?.Index,
                _stops,
                _error,
                _time.GetElapsedTime(_started, _ended ?? _time.GetTimestamp()));
        }
    }

    private static double? CheckSpeed(double? speed) =>
        speed is null or (> 0 and <= double.MaxValue)
            ? speed
            : throw new DomainException("The speed must be a positive number of positions per second.");

    private async Task RunAsync()
    {
        try
        {
            var budget = 0.0;
            var last = _time.GetTimestamp();
            while (!_cancelled && _step < DrumPosition.Count)
            {
                if (Speed is not { } speed)
                {
                    Test(_step, Math.Min(_step + FullSpeedChunk, DrumPosition.Count), pause: false);
                    (budget, last) = (0, _time.GetTimestamp());
                    continue;
                }

                var now = _time.GetTimestamp();
                budget += _time.GetElapsedTime(last, now).TotalSeconds * speed;
                last = now;
                var count = (int)Math.Min(budget, DrumPosition.Count - _step);
                budget -= count;
                Test(_step, _step + count, pause: true);
                if (IsPaused)
                {
                    await WaitWhilePausedAsync().ConfigureAwait(false);
                    (budget, last) = (0, _time.GetTimestamp());
                }
                else if (_step < DrumPosition.Count)
                {
                    await Task.Delay(Tick, _time).ConfigureAwait(false);
                }
            }
        }
        catch (Exception exception)
        {
            lock (_lock)
            {
                _error = exception.GetBaseException().Message;
            }
        }
        finally
        {
            lock (_lock)
            {
                _pause = null;
                _ended = _time.GetTimestamp();
                _status = _error is not null ? RunStatus.Failed : _cancelled ? RunStatus.Cancelled : RunStatus.Finished;
            }
        }
    }

    private async Task WaitWhilePausedAsync()
    {
        while (IsPaused && !_cancelled)
        {
            await Task.Delay(Tick, _time).ConfigureAwait(false);
        }
    }

    // Tests the steps [from, to) on every group and prints the stops, by step and then group. With pause, it stops after
    // the first step with a stop and pauses the run at its first stop.
    private void Test(int from, int to, bool pause)
    {
        var found = new List<(int Step, int Group, PrintedStop Stop)>[_machines.Length];
        Parallel.For(0, _machines.Length, index =>
        {
            var (group, machine) = (_machines[index].Group, _machines[index].Machine);
            var stops = new List<(int, int, PrintedStop)>();
            for (var step = from; step < to; step++)
            {
                var letters = BombeMachine.PositionAt(step);
                if (machine.LiveWiresAt(letters) is { } live)
                {
                    stops.Add((step, index, new PrintedStop(group.Chains, group.WheelOrder, letters, machine.TestRegister, live)));
                    if (pause)
                    {
                        break;
                    }
                }
            }

            found[index] = stops;
        });

        var stops = found.SelectMany(stops => stops).OrderBy(stop => stop.Step).ThenBy(stop => stop.Group).ToList();
        if (pause && stops.Count > 0)
        {
            var first = stops[0].Step;
            stops = [.. stops.Where(stop => stop.Step == first)];
            to = first + 1;
        }

        var index = _printout.Add(stops.Select(stop => stop.Stop));
        _log?.Add(
            stops.Select(stop => stop.Stop).Where(stop => stop.WheelOrder is not null).Select(stop =>
                new BombeStop(stop.WheelOrder!, stop.WheelOrder!.CorePositions(stop.DrumLetters), stop.TestRegister, stop.LiveWires)),
            Reflector,
            _placement!,
            _solution);
        lock (_lock)
        {
            _step = to;
            _stops += stops.Count;
            if (pause && stops.Count > 0)
            {
                _pause = (stops[0].Stop, index);
            }
        }
    }
}

/// <summary>
/// How far a run has got: the positions tested, the upper drums' letters while it runs, the stop a paused run waits at
/// with its index on the printout, and the stops it found.
/// </summary>
public sealed record RunProgress(
    RunStatus Status,
    double? Speed,
    int PositionsTested,
    DrumPosition? Position,
    PrintedStop? Pause,
    int? PauseIndex,
    int Stops,
    string? Error,
    TimeSpan Elapsed);
