using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>A guessed piece of plain text, such as WETTERVORHERSAGE.</summary>
public sealed record Crib
{
    public Crib(IReadOnlyList<Letter> letters)
    {
        ArgumentNullException.ThrowIfNull(letters);

        if (letters.Count == 0) throw new DomainException("The crib has no letters.");

        Letters = [.. letters];
    }

    public IReadOnlyList<Letter> Letters { get; }

    public int Length => Letters.Count;

    public bool Equals(Crib? other)
    {
        return other is not null && Letters.SequenceEqual(other.Letters);
    }

    public static Crib Parse(string text)
    {
        ArgumentNullException.ThrowIfNull(text);

        return new Crib([.. text.Select(Letter.FromChar)]);
    }

    public override int GetHashCode()
    {
        return Letters.Aggregate(0, (hash, letter) => HashCode.Combine(hash, letter));
    }

    public override string ToString()
    {
        return string.Concat(Letters);
    }
}
