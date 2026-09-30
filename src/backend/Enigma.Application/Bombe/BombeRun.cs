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
/// A Bombe run in the background: the drums turn once through all 17,576 positions, and at each one every copy of the
/// menu with drums fitted is tested with its wheel order and start letters. At full speed (null) the copies are tested
/// in parallel; at a set speed (positions per second) the run is paced by the clock and pauses at each stop until it is
/// continued. The speed can change while the run goes. The stops go to the stop log.
/// </summary>
public sealed class BombeRun
{
    /// <summary>The speed of a real Bombe: a run in about 20 minutes.</summary>
    public const double HistoricalSpeed = DrumPosition.Count / (20 * 60.0);

    // The positions tested at full speed between looks at the speed and the cancel flag.
    private const int FullSpeedChunk = Letter.Count * Letter.Count;

    private static readonly TimeSpan Tick = TimeSpan.FromMilliseconds(20);

    private readonly Lock _lock = new();
    private readonly BombeMachine[] _machines;
    private readonly StopLog _log;
    private readonly CribPlacement _placement;
    private readonly Solution? _solution;
    private readonly TimeProvider _time;
    private readonly long _started;
    private volatile bool _cancelled;
    private double? _speed;
    private int _step;
    private int _stops;
    private (BombeStop Stop, int Index)? _pause;
    private long? _ended;
    private RunStatus _status = RunStatus.Running;
    private string? _error;

    private BombeRun(BombeJob job, double? speed, TimeProvider time, StopLog log)
    {
        var menu = job.Menu ?? throw new DomainException("Build a menu first.");
        _placement = job.Placement ?? throw new DomainException("Place the crib first.");
        _solution = job.Source?.Solution;
        var (reflector, input, diagonalBoard) = (job.Reflector, job.Input, job.DiagonalBoard);
        _machines = [.. job.FittedCopies().Select(copy =>
            new BombeMachine(new Scrambler(copy.WheelOrder!, reflector), menu, input, diagonalBoard, copy.Starts))];
        WheelOrders = [.. _machines.Select(machine => machine.WheelOrder)];
        Reflector = reflector;
        _log = log;
        _speed = CheckSpeed(speed);
        _time = time;
        _started = time.GetTimestamp();
        Completion = Task.Run(RunAsync);
    }

    /// <summary>The wheel orders of the copies tested, in the order of the copies.</summary>
    public IReadOnlyList<WheelOrder> WheelOrders { get; }

    public ReflectorType Reflector { get; }

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

    /// <summary>Starts running the copies of the menu with drums fitted.</summary>
    public static BombeRun Start(BombeJob job, double? speed, TimeProvider time, StopLog log)
    {
        ArgumentNullException.ThrowIfNull(job);
        ArgumentNullException.ThrowIfNull(time);
        ArgumentNullException.ThrowIfNull(log);

        return new BombeRun(job, speed, time, log);
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

    // Tests the steps [from, to) on every copy and logs the stops, by step and then copy. With pause, it stops after the
    // first step with a stop and pauses the run at its first stop.
    private void Test(int from, int to, bool pause)
    {
        var found = new List<(int Step, int Copy, BombeStop Stop)>[_machines.Length];
        Parallel.For(0, _machines.Length, copy =>
        {
            var machine = _machines[copy];
            var stops = new List<(int, int, BombeStop)>();
            for (var step = from; step < to; step++)
            {
                if (machine.Test(machine.WheelOrder.CorePositions(BombeMachine.PositionAt(step))) is { } stop)
                {
                    stops.Add((step, copy, stop));
                    if (pause)
                    {
                        break;
                    }
                }
            }

            found[copy] = stops;
        });

        var stops = found.SelectMany(stops => stops).OrderBy(stop => stop.Step).ThenBy(stop => stop.Copy).ToList();
        if (pause && stops.Count > 0)
        {
            var first = stops[0].Step;
            stops = [.. stops.Where(stop => stop.Step == first)];
            to = first + 1;
        }

        var index = _log.Add(stops.Select(stop => stop.Stop), Reflector, _placement, _solution);
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
/// with its index in the stop log, and the stops it found.
/// </summary>
public sealed record RunProgress(
    RunStatus Status,
    double? Speed,
    int PositionsTested,
    DrumPosition? Position,
    BombeStop? Pause,
    int? PauseIndex,
    int Stops,
    string? Error,
    TimeSpan Elapsed);
