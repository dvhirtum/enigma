using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Application.Bombe;

public enum RunStatus
{
    Running,
    Finished,
    Cancelled,
    Failed,
}

/// <summary>
/// A Bombe run of the job's menu over its wheel orders, in the background. At full speed (null) the wheel orders run
/// in parallel; at a set speed (positions per second) one wheel order runs at a time, paced by the clock. The speed can
/// change while the run goes.
/// </summary>
public sealed class BombeRun
{
    /// <summary>The speed of a real Bombe: a wheel order in about 20 minutes.</summary>
    public const double HistoricalSpeed = DrumPosition.Count / (20 * 60.0);

    private static readonly TimeSpan Tick = TimeSpan.FromMilliseconds(20);

    private readonly Lock _lock = new();
    private readonly Func<WheelOrder, BombeMachine> _machine;
    private readonly bool[] _done;
    private readonly List<BombeStop> _stops = [];
    private readonly TimeProvider _time;
    private readonly long _started;
    private volatile bool _cancelled;
    private double? _speed;
    private int _ordersDone;
    private (BombeMachine Machine, int Order, int Step)? _current;
    private long? _ended;
    private RunStatus _status = RunStatus.Running;
    private string? _error;

    private BombeRun(BombeJob job, double? speed, TimeProvider time)
    {
        var menu = job.Menu ?? throw new DomainException("Build a menu first.");
        var (reflector, input, diagonalBoard) = (job.Reflector, job.Input, job.DiagonalBoard);
        _machine = order => new BombeMachine(new Scrambler(order, reflector), menu, input, diagonalBoard);
        WheelOrders = job.WheelOrders;
        Reflector = reflector;
        _done = new bool[WheelOrders.Count];
        _speed = CheckSpeed(speed);
        _time = time;
        _started = time.GetTimestamp();
        Completion = Task.Run(RunAsync);
    }

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
                return _status;
            }
        }
    }

    /// <summary>Starts running the job's menu over its wheel orders.</summary>
    public static BombeRun Start(BombeJob job, double? speed, TimeProvider time)
    {
        ArgumentNullException.ThrowIfNull(job);
        ArgumentNullException.ThrowIfNull(time);

        return new BombeRun(job, speed, time);
    }

    public void Cancel() => _cancelled = true;

    public RunProgress Progress()
    {
        lock (_lock)
        {
            return new RunProgress(
                _status,
                _speed,
                _ordersDone,
                ((long)_ordersDone * DrumPosition.Count) + (_current?.Step ?? 0),
                _current?.Machine.WheelOrder,
                _current is { } current ? BombeMachine.PositionAt(current.Step) : null,
                _stops.Count,
                _error,
                _time.GetElapsedTime(_started, _ended ?? _time.GetTimestamp()));
        }
    }

    /// <summary>The stops found so far, from the <paramref name="from"/>th on.</summary>
    public IReadOnlyList<BombeStop> Stops(int from)
    {
        lock (_lock)
        {
            return [.. _stops.Skip(Math.Max(0, from))];
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
            while (!_cancelled && Array.IndexOf(_done, false) is var next and >= 0)
            {
                if (Speed is null)
                {
                    RunFullSpeed();
                }
                else
                {
                    await RunPacedAsync(next).ConfigureAwait(false);
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
                _current = null;
                _ended = _time.GetTimestamp();
                _status = _error is not null ? RunStatus.Failed : _cancelled ? RunStatus.Cancelled : RunStatus.Finished;
            }
        }
    }

    // Finishes the wheel order in hand, then runs the others in parallel until a speed is set.
    private void RunFullSpeed()
    {
        if (_current is { } current)
        {
            Test(current.Machine, current.Order, current.Step, DrumPosition.Count);
        }

        Parallel.ForEach(Enumerable.Range(0, WheelOrders.Count).Where(order => !_done[order]), (order, loop) =>
        {
            if (_cancelled || Speed is not null)
            {
                loop.Stop();
                return;
            }

            Test(_machine(WheelOrders[order]), order, 0, DrumPosition.Count);
        });
    }

    // Runs one wheel order at the set speed, until it is done, cancelled or the speed is set to full.
    private async Task RunPacedAsync(int order)
    {
        var (machine, _, step) = _current ?? (_machine(WheelOrders[order]), order, 0);
        lock (_lock)
        {
            _current = (machine, order, step);
        }

        var budget = 0.0;
        var last = _time.GetTimestamp();
        while (step < DrumPosition.Count && !_cancelled && Speed is { } speed)
        {
            var now = _time.GetTimestamp();
            budget += _time.GetElapsedTime(last, now).TotalSeconds * speed;
            last = now;
            var count = (int)Math.Min(budget, DrumPosition.Count - step);
            budget -= count;
            step = Test(machine, order, step, step + count);
            if (step < DrumPosition.Count)
            {
                await Task.Delay(Tick, _time).ConfigureAwait(false);
            }
        }
    }

    // Tests the steps [from, to) of a wheel order and records its stops; returns the next step.
    private int Test(BombeMachine machine, int order, int from, int to)
    {
        var stops = new List<BombeStop>();
        for (var step = from; step < to; step++)
        {
            if (machine.Test(BombeMachine.PositionAt(step)) is { } stop)
            {
                stops.Add(stop);
            }
        }

        lock (_lock)
        {
            _stops.AddRange(stops);
            if (to < DrumPosition.Count)
            {
                _current = (machine, order, to);
            }
            else
            {
                _done[order] = true;
                _ordersDone++;
                _current = _current?.Order == order ? null : _current;
            }
        }

        return to;
    }
}

/// <summary>How far a run has got. The wheel order and drum position in hand are known while the run is paced.</summary>
public sealed record RunProgress(
    RunStatus Status,
    double? Speed,
    int WheelOrdersDone,
    long PositionsTested,
    WheelOrder? WheelOrder,
    DrumPosition? Position,
    int Stops,
    string? Error,
    TimeSpan Elapsed);
