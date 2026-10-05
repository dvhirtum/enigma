using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>
///     An Offizier or Stab key for one month: the key for each day (without Grundstellung) and 26 settings, named by
///     letter, that the officer chooses from for each message.
/// </summary>
public sealed class OfficerKey
{
    public OfficerKey(IReadOnlyList<DailyKey> days, SettingList settings)
    {
        ArgumentNullException.ThrowIfNull(days);
        ArgumentNullException.ThrowIfNull(settings);

        if (days.Count == 0) throw new DomainException("An officer key needs at least one day.");

        var twice = days.GroupBy(k => k.Day).FirstOrDefault(g => g.Count() > 1);
        if (twice is not null) throw new DomainException($"Day {twice.Key} appears more than once in the officer key.");

        Model = days[0].Model;
        if (days.Any(k => k.Model != Model)) throw new DomainException("All days of an officer key are for one model.");

        if (settings.Width != Model.Slots.Count)
            throw new DomainException(
                $"The {Model} needs settings of {Model.Slots.Count} letters, got {settings.Width}.");

        Days = [.. days.OrderBy(k => k.Day)];
        Settings = settings;
    }

    public MachineModel Model { get; }

    /// <summary>The key for each day, ordered by day.</summary>
    public IReadOnlyList<DailyKey> Days { get; }

    public SettingList Settings { get; }
}
