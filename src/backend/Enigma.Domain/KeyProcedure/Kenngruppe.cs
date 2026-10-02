using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>A trigram from the Kenngruppenbuch: a Schlüsselkenngruppe or a Verfahrenkenngruppe.</summary>
public readonly record struct Kenngruppe
{
    public const int Count = Letter.Count * Letter.Count * Letter.Count;

    private readonly string _letters;

    private Kenngruppe(string letters)
    {
        _letters = letters;
    }

    public IReadOnlyList<Letter> Letters => [.. (_letters ?? "AAA").Select(Letter.FromChar)];

    public static Kenngruppe Parse(string value)
    {
        ArgumentNullException.ThrowIfNull(value);

        return value.Length == 3 && value.All(char.IsAsciiLetter)
            ? new Kenngruppe(value.ToUpperInvariant())
            : throw new DomainException($"'{value}' is not a Kenngruppe of three letters.");
    }

    public static Kenngruppe FromLetters(Letter first, Letter second, Letter third)
    {
        return new Kenngruppe($"{first}{second}{third}");
    }

    /// <summary>The trigram with index 0 (AAA) to 17,575 (ZZZ).</summary>
    public static Kenngruppe FromIndex(int index)
    {
        return index is >= 0 and < Count
            ? FromLetters(
                Letter.FromIndex(index / (Letter.Count * Letter.Count)),
                Letter.FromIndex(index / Letter.Count % Letter.Count),
                Letter.FromIndex(index % Letter.Count))
            : throw new DomainException($"Kenngruppe index {index} is outside 0–{Count - 1}.");
    }

    public override string ToString()
    {
        return _letters ?? string.Empty;
    }
}
