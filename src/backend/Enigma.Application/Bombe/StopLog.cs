using Enigma.Application.Procedure;
using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Application.Bombe;

/// <summary>
///     The stops of the runs on the job's menu, in the order found, each with the reflector it was found with and its
///     check,
///     started when first asked for. Cleared when the message, crib or menu changes, or by hand.
/// </summary>
public sealed class StopLog
{
    private readonly Dictionary<int, StopCheck> _checks = [];
    private readonly Lock _lock = new();

    private readonly List<(BombeStop Stop, ReflectorType Reflector, CribPlacement Placement, Solution? Solution)>
        _stops = [];

    public int Count
    {
        get
        {
            lock (_lock)
            {
                return _stops.Count;
            }
        }
    }

    /// <summary>Adds stops found with <paramref name="reflector" />; returns the index of the first.</summary>
    public int Add(IEnumerable<BombeStop> stops, ReflectorType reflector, CribPlacement placement, Solution? solution)
    {
        ArgumentNullException.ThrowIfNull(stops);

        lock (_lock)
        {
            var first = _stops.Count;
            _stops.AddRange(stops.Select(stop => (stop, reflector, placement, solution)));
            return first;
        }
    }

    public void Clear()
    {
        lock (_lock)
        {
            _stops.Clear();
            _checks.Clear();
        }
    }

    /// <summary>Forgets the rings read from the indicator on every check.</summary>
    public void ClearReadings()
    {
        lock (_lock)
        {
            foreach (var check in _checks.Values) check.Reading = null;
        }
    }

    /// <summary>The stops from the <paramref name="from" />th on, at most <paramref name="count" /> (null: all).</summary>
    public IReadOnlyList<BombeStop> Stops(int from, int? count = null)
    {
        lock (_lock)
        {
            return
            [
                .. _stops.Skip(Math.Max(0, from)).Take(Math.Max(0, count ?? int.MaxValue)).Select(entry => entry.Stop)
            ];
        }
    }

    /// <summary>The check of the <paramref name="index" />th stop (0 = the first), started when first asked for.</summary>
    public StopCheck Check(int index)
    {
        lock (_lock)
        {
            if (index < 0 || index >= _stops.Count) throw new NotFoundException($"There is no stop {index}.");

            if (!_checks.TryGetValue(index, out var check))
            {
                var (stop, reflector, placement, _) = _stops[index];
                check = new StopCheck(stop, reflector, placement);
                _checks[index] = check;
            }

            return check;
        }
    }

    /// <summary>The solution of the message the <paramref name="index" />th stop was found on, when it has one.</summary>
    public Solution? SolutionOf(int index)
    {
        lock (_lock)
        {
            return index >= 0 && index < _stops.Count ? _stops[index].Solution : null;
        }
    }

    /// <summary>The verdict given on the <paramref name="index" />th stop.</summary>
    public StopVerdict VerdictOn(int index)
    {
        lock (_lock)
        {
            return _checks.TryGetValue(index, out var check) ? check.Verdict : StopVerdict.Unchecked;
        }
    }
}
