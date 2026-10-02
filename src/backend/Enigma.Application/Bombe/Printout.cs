using Enigma.Domain.Bombe;

namespace Enigma.Application.Bombe;

/// <summary>The stops the Bombe printed, in the order found, kept until cleared by hand.</summary>
public sealed class Printout
{
    private readonly Lock _lock = new();
    private readonly List<PrintedStop> _stops = [];

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

    /// <summary>Prints stops; returns the index of the first.</summary>
    public int Add(IEnumerable<PrintedStop> stops)
    {
        ArgumentNullException.ThrowIfNull(stops);

        lock (_lock)
        {
            var first = _stops.Count;
            _stops.AddRange(stops);
            return first;
        }
    }

    public void Clear()
    {
        lock (_lock)
        {
            _stops.Clear();
        }
    }

    /// <summary>The stops from the <paramref name="from" />th on, at most <paramref name="count" /> (null: all).</summary>
    public IReadOnlyList<PrintedStop> Stops(int from, int? count = null)
    {
        lock (_lock)
        {
            return [.. _stops.Skip(Math.Max(0, from)).Take(Math.Max(0, count ?? int.MaxValue))];
        }
    }
}
