using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>
///     26 rotor settings, one for each letter A–Z, as on an Offizier or Stab key or a weather short-signal table.
/// </summary>
public sealed class SettingList
{
    private readonly RotorPositions[] _settings;

    public SettingList(IEnumerable<RotorPositions> settings)
    {
        ArgumentNullException.ThrowIfNull(settings);

        _settings = [.. settings];
        if (_settings.Length != Letter.Count)
            throw new DomainException($"A setting list has {Letter.Count} settings, one for each letter.");

        if (_settings.Any(s => s.Count != _settings[0].Count))
            throw new DomainException("All settings of a list have the same number of letters.");
    }

    /// <summary>The settings for A to Z.</summary>
    public IReadOnlyList<RotorPositions> Settings => _settings;

    /// <summary>The number of letters of each setting: 3 or 4.</summary>
    public int Width => _settings[0].Count;

    public RotorPositions this[Letter letter] => _settings[letter.Index];

    /// <summary>
    ///     Generates settings of <paramref name="width" /> letters in which each letter appears once in each place, as on
    ///     most Navy setting lists.
    /// </summary>
    public static SettingList Generate(int width, Random random)
    {
        ArgumentNullException.ThrowIfNull(random);

        var places = Enumerable.Range(0, width).Select(_ =>
        {
            var letters = Enumerable.Range(0, Letter.Count).ToArray();
            random.Shuffle(letters);
            return letters;
        }).ToArray();
        return new SettingList(Enumerable.Range(0, Letter.Count).Select(i =>
            new RotorPositions(places.Select(place => new RotorPosition(Letter.FromIndex(place[i]))))));
    }

    public static SettingList Parse(IReadOnlyList<string> settings)
    {
        ArgumentNullException.ThrowIfNull(settings);

        return new SettingList(settings.Select(RotorPositions.Parse));
    }
}
