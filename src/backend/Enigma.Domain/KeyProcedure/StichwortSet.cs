using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>
///     A sealed Stichwort envelope: the name in the order (STICHWORTBEFEHL PERSEUS) and the six-letter word inside
///     (DANZIG).
/// </summary>
public sealed record Stichwort
{
    public const int WordLength = 6;

    private static readonly RotorType[] NumberedRotors =
        [RotorType.I, RotorType.II, RotorType.III, RotorType.IV, RotorType.V, RotorType.VI, RotorType.VII, RotorType.VIII];

    public Stichwort(string name, string word)
    {
        if (string.IsNullOrWhiteSpace(name) || !name.All(char.IsAsciiLetterUpper))
            throw new DomainException($"'{name}' is not a Stichwort name in capitals.");

        if (word is null || word.Length != WordLength || !word.All(char.IsAsciiLetterUpper))
            throw new DomainException($"'{word}' is not a Stichwort of {WordLength} capitals.");

        Name = name;
        Word = word;
    }

    public string Name { get; }

    public string Word { get; }

    /// <summary>
    ///     Changes a daily key by the Danzig rule, with A = 1: the first letter is added to each rotor number (VI + D = II),
    ///     the next three to the left, middle and right rings, and the fifth to each plug letter. The sixth is a dummy.
    ///     The Greek rotor, its ring and the Grundstellung stay.
    /// </summary>
    public DailyKey Apply(DailyKey key)
    {
        ArgumentNullException.ThrowIfNull(key);

        var greek = key.Rotors.Count - 3;
        var rotors = key.Rotors.Select((rotor, i) => i < greek
            ? rotor
            : NumberedRotors[(Array.IndexOf(NumberedRotors, rotor) + Value(0)) % NumberedRotors.Length]);
        var rings = key.Rings.Select((ring, i) => i < greek ? ring : new RingSetting(ring.Letter.Shift(Value(i - greek + 1))));
        var plugs = key.Plugs.Select(p => PlugPair.Create(p.First.Shift(Value(4)), p.Second.Shift(Value(4))));
        return new DailyKey(key.Day, key.Reflector, [.. rotors], [.. rings], [.. plugs], key.Grundstellung);
    }

    private int Value(int index)
    {
        return Word[index] - 'A' + 1;
    }
}

/// <summary>The year's sealed Stichwort envelopes, held by every holder of the machine.</summary>
public sealed class StichwortSet
{
    public const int EnvelopeCount = 8;

    private static readonly string[] Names =
        ["PERSEUS", "ORION", "PEGASUS", "HERKULES", "KASSIOPEIA", "CEPHEUS", "BOOTES", "AURIGA", "SIRIUS", "WEGA",
            "ATAIR", "DENEB"];

    private static readonly string[] Words =
        ["DANZIG", "BREMEN", "KASSEL", "BERLIN", "ERFURT", "MINDEN", "PASSAU", "LINDAU", "GOSLAR", "HAMELN",
            "COBURG", "MEPPEN", "VERDEN", "ELBING", "TILSIT", "BOCHUM"];

    public StichwortSet(string id, int year, IEnumerable<Stichwort> envelopes)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentNullException.ThrowIfNull(envelopes);

        Envelopes = [.. envelopes];
        if (Envelopes.Count == 0) throw new DomainException("A Stichwort set needs at least one envelope.");

        var twice = Envelopes.GroupBy(e => e.Name).FirstOrDefault(g => g.Count() > 1);
        if (twice is not null) throw new DomainException($"Stichwort {twice.Key} appears more than once.");

        Id = id;
        Year = new KeyMonth(year, 1).Year;
    }

    public string Id { get; }

    public int Year { get; }

    public IReadOnlyList<Stichwort> Envelopes { get; }

    public static StichwortSet Generate(string id, int year, Random random)
    {
        ArgumentNullException.ThrowIfNull(random);

        var names = Names.ToArray();
        var words = Words.ToArray();
        random.Shuffle(names);
        random.Shuffle(words);
        return new StichwortSet(id, year,
            names.Zip(words, (name, word) => new Stichwort(name, word)).Take(EnvelopeCount));
    }

    /// <summary>True when <paramref name="other" /> has the same id, year and envelopes.</summary>
    public bool IsSameAs(StichwortSet other)
    {
        ArgumentNullException.ThrowIfNull(other);

        return other.Id == Id && other.Year == Year && other.Envelopes.SequenceEqual(Envelopes);
    }
}
