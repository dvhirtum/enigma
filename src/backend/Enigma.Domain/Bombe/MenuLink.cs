using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// A pair of crib letters on the menu: one enciphers to the other at the drum position <paramref name="Offset"/> places
/// after the core position under test. A scrambler set to that offset connects their cables.
/// </summary>
public sealed record MenuLink
{
    public MenuLink(Letter first, Letter second, int offset)
    {
        if (first == second)
        {
            throw new DomainException($"The Enigma never enciphers {first} to itself.");
        }

        if (offset is < 0 or >= DrumPosition.Count)
        {
            throw new DomainException($"Offset {offset} is outside 0–{DrumPosition.Count - 1}.");
        }

        First = first;
        Second = second;
        Offset = offset;
    }

    public Letter First { get; }

    public Letter Second { get; }

    public int Offset { get; }

    /// <summary>Parses a link such as "SW1": the two letters, then the offset.</summary>
    public static MenuLink Parse(string link)
    {
        ArgumentNullException.ThrowIfNull(link);

        return link.Length >= 3
            && int.TryParse(link.AsSpan(2), System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out var offset)
            ? new MenuLink(Letter.FromChar(link[0]), Letter.FromChar(link[1]), offset)
            : throw new DomainException($"'{link}' is not a menu link such as SW1.");
    }

    public override string ToString() => $"{First}{Second}{Offset}";
}
