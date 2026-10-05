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

    public string Network { get; }

    public KeyMonth Month { get; }

    public MachineModel Model { get; }

    public Provenance Provenance { get; }

    public bool IsReadOnly => Provenance is HistoricalProvenance;

    /// <summary>The linked Kenngruppenbuch, or null before linking.</summary>
    public string? KenngruppenbuchId { get; private set; }

    /// <summary>The linked Tauschtafel set, or null before linking.</summary>
    public string? TauschtafelSetId { get; private set; }

    /// <summary>The linked Stichwort set for the sheet's year, or null before linking.</summary>
    public string? StichwortSetId { get; private set; }

    /// <summary>The linked weather short-signal tables for the sheet's year, or null before linking.</summary>
    public string? WetterTafelSetId { get; private set; }

    /// <summary>The Offizier key, or null when the sheet has none yet.</summary>
    public OfficerKey? Offizier { get; private set; }

    /// <summary>The Stab key, or null when the sheet has none yet.</summary>
    public OfficerKey? Stab { get; private set; }

    public bool IsLinked => KenngruppenbuchId is not null && TauschtafelSetId is not null && StichwortSetId is not null
                            && WetterTafelSetId is not null;

    public bool HasMissingOfficerKeys => Offizier is null || Stab is null;

    /// <summary>The daily keys, ordered by day.</summary>
    public IReadOnlyList<DailyKey> DailyKeys { get; private set; }

    public bool HasMissingGrundstellungen => DailyKeys.Any(k => k.Grundstellung is null);

    /// <summary>Links the Kenngruppenbuch and Tauschtafel set used with this sheet. Allowed on historical sheets.</summary>
    public void Link(string kenngruppenbuchId, string tauschtafelSetId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(kenngruppenbuchId);
        ArgumentException.ThrowIfNullOrWhiteSpace(tauschtafelSetId);

        KenngruppenbuchId = kenngruppenbuchId;
        TauschtafelSetId = tauschtafelSetId;
    }

    /// <summary>Links the Stichwort set and weather tables of the sheet's year. Allowed on historical sheets.</summary>
    public void LinkYearly(string stichwortSetId, string wetterTafelSetId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(stichwortSetId);
        ArgumentException.ThrowIfNullOrWhiteSpace(wetterTafelSetId);

        StichwortSetId = stichwortSetId;
        WetterTafelSetId = wetterTafelSetId;
    }

    /// <summary>Sets the Offizier and Stab keys; null leaves a key as it is. Allowed on historical sheets.</summary>
    public void SetOfficerKeys(OfficerKey? offizier, OfficerKey? stab)
    {
        foreach (var key in new[] { offizier, stab }.OfType<OfficerKey>())
        {
            if (key.Model != Model)
                throw new DomainException($"An officer key for the {key.Model} does not fit a {Model} key sheet.");

            var outside = key.Days.FirstOrDefault(k => k.Day > Month.Days);
            if (outside is not null) throw new DomainException($"Officer key day {outside.Day} is outside {Month}.");
        }

        Offizier = offizier ?? Offizier;
        Stab = stab ?? Stab;
    }

    /// <summary>Generates the Offizier and Stab keys the sheet lacks. Returns true when one was added.</summary>
    public bool FillMissingOfficerKeys(Random random)
    {
        ArgumentNullException.ThrowIfNull(random);

        if (!HasMissingOfficerKeys) return false;

        SetOfficerKeys(Offizier is null ? OfficerKeyGenerator.Offizier(this, random) : null,
            Stab is null ? OfficerKeyGenerator.Stab(this, random) : null);
        return true;
    }

    public DailyKey KeyFor(int day)
    {
        return DailyKeys.FirstOrDefault(k => k.Day == day)
               ?? throw new DomainException($"Key sheet {Network} {Month} has no key for day {day}.");
    }

    /// <summary>
    ///     Gives every day without a Grundstellung a random one. Allowed on historical sheets, which gave none.
    ///     Returns true when a day changed.
    /// </summary>
    public bool FillMissingGrundstellungen(Random random)
    {
        ArgumentNullException.ThrowIfNull(random);

        if (!HasMissingGrundstellungen) return false;

        DailyKeys =
        [
            .. DailyKeys.Select(key => key.Grundstellung is null
                ? key.WithGrundstellung(new RotorPositions(key.Rotors.Select(_ =>
                    new RotorPosition(Letter.FromIndex(random.Next(Letter.Count))))))
                : key)
        ];
        return true;
    }

    /// <summary>Gives <paramref name="day" /> a Grundstellung. Allowed on historical sheets.</summary>
    public void SetGrundstellung(int day, RotorPositions grundstellung)
    {
        var key = KeyFor(day);
        DailyKeys = [.. DailyKeys.Select(k => k == key ? k.WithGrundstellung(grundstellung) : k)];
    }

    private static (string, KeyMonth, MachineModel, IReadOnlyList<DailyKey>) Validate(
        string network, KeyMonth month, IReadOnlyList<DailyKey> dailyKeys)
    {
        ArgumentNullException.ThrowIfNull(dailyKeys);

        if (string.IsNullOrWhiteSpace(network)) throw new DomainException("A key sheet needs a network name.");

        if (dailyKeys.Count == 0) throw new DomainException("A key sheet needs at least one daily key.");

        var model = dailyKeys[0].Model;
        var other = dailyKeys.FirstOrDefault(k => k.Model != model);
        if (other is not null)
            throw new DomainException(
                $"Day {other.Day} is for the {other.Model}, but day {dailyKeys[0].Day} is for the {model}.");

        var outside = dailyKeys.FirstOrDefault(k => k.Day > month.Days);
        if (outside is not null) throw new DomainException($"Day {outside.Day} is outside {month}.");

        var twice = dailyKeys.GroupBy(k => k.Day).FirstOrDefault(g => g.Count() > 1);
        if (twice is not null) throw new DomainException($"Day {twice.Key} appears more than once.");

        return (network.Trim(), month, model, [.. dailyKeys.OrderBy(k => k.Day)]);
    }
}
