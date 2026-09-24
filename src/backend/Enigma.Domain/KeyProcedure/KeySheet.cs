using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>A monthly key sheet (Schlüsseltafel) for one network and model. Historical sheets are read-only.</summary>
public sealed class KeySheet
{
    public KeySheet(string id, string network, KeyMonth month, Provenance provenance, IReadOnlyList<DailyKey> dailyKeys)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentNullException.ThrowIfNull(provenance);

        Id = id;
        Provenance = provenance;
        (Network, Month, Model, DailyKeys) = Validate(network, month, dailyKeys);
    }

    public string Id { get; }

    public string Network { get; private set; }

    public KeyMonth Month { get; private set; }

    public MachineModel Model { get; private set; }

    public Provenance Provenance { get; }

    public bool IsReadOnly => Provenance is HistoricalProvenance;

    /// <summary>The daily keys, ordered by day.</summary>
    public IReadOnlyList<DailyKey> DailyKeys { get; private set; }

    public DailyKey KeyFor(int day) =>
        DailyKeys.FirstOrDefault(k => k.Day == day)
        ?? throw new DomainException($"Key sheet {Network} {Month} has no key for day {day}.");

    /// <summary>Replaces the network, month and daily keys.</summary>
    public void Update(string network, KeyMonth month, IReadOnlyList<DailyKey> dailyKeys)
    {
        if (IsReadOnly)
        {
            throw new DomainException($"Historical key sheet {Network} {Month} is read-only.");
        }

        (Network, Month, Model, DailyKeys) = Validate(network, month, dailyKeys);
    }

    private static (string, KeyMonth, MachineModel, IReadOnlyList<DailyKey>) Validate(
        string network, KeyMonth month, IReadOnlyList<DailyKey> dailyKeys)
    {
        ArgumentNullException.ThrowIfNull(dailyKeys);

        if (string.IsNullOrWhiteSpace(network))
        {
            throw new DomainException("A key sheet needs a network name.");
        }

        if (dailyKeys.Count == 0)
        {
            throw new DomainException("A key sheet needs at least one daily key.");
        }

        var model = dailyKeys[0].Model;
        var other = dailyKeys.FirstOrDefault(k => k.Model != model);
        if (other is not null)
        {
            throw new DomainException($"Day {other.Day} is for the {other.Model}, but day {dailyKeys[0].Day} is for the {model}.");
        }

        var outside = dailyKeys.FirstOrDefault(k => k.Day > month.Days);
        if (outside is not null)
        {
            throw new DomainException($"Day {outside.Day} is outside {month}.");
        }

        var twice = dailyKeys.GroupBy(k => k.Day).FirstOrDefault(g => g.Count() > 1);
        if (twice is not null)
        {
            throw new DomainException($"Day {twice.Key} appears more than once.");
        }

        return (network.Trim(), month, model, [.. dailyKeys.OrderBy(k => k.Day)]);
    }
}
