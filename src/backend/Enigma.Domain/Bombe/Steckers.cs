using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// The steckers found while checking a stop: each letter's partner, the letter itself when it is unsteckered, or
/// unknown. Written as pairs such as "AD ET RR" (RR: R is unsteckered).
/// </summary>
public sealed class Steckers : IEquatable<Steckers>
{
    private readonly Letter?[] _partners;

    private Steckers(Letter?[] partners) => _partners = partners;

    public static Steckers None { get; } = new(new Letter?[Letter.Count]);

    /// <summary>The known pairs, lower letter first, in alphabetical order. A self pair is an unsteckered letter.</summary>
    public IReadOnlyList<(Letter First, Letter Second)> Pairs =>
        [.. Enumerable.Range(0, Letter.Count)
            .Where(index => _partners[index] is { } partner && partner.Index >= index)
            .Select(index => (Letter.FromIndex(index), _partners[index]!.Value))];

    /// <summary>The plugboard cables: the known pairs of two different letters.</summary>
    public IReadOnlyList<PlugPair> Plugs =>
        [.. Pairs.Where(pair => pair.First != pair.Second).Select(pair => PlugPair.Create(pair.First, pair.Second))];

    public static Steckers Parse(string pairs)
    {
        ArgumentNullException.ThrowIfNull(pairs);

        return pairs.Split(' ', StringSplitOptions.RemoveEmptyEntries).Aggregate(None, (steckers, pair) =>
            pair.Length == 2
                ? steckers.With(Letter.FromChar(pair[0]), Letter.FromChar(pair[1]))
                : throw new DomainException($"'{pair}' is not a stecker pair such as AD or RR."));
    }

    public Letter? PartnerOf(Letter letter) => _partners[letter.Index];

    /// <summary>Adds the pair <paramref name="a"/>/<paramref name="b"/>; refused when either letter has another partner.</summary>
    public Steckers With(Letter a, Letter b)
    {
        foreach (var (letter, partner) in new[] { (a, b), (b, a) })
        {
            if (PartnerOf(letter) is { } known && known != partner)
            {
                throw new DomainException($"{letter} is already steckered to {known}.");
            }
        }

        var partners = (Letter?[])_partners.Clone();
        partners[a.Index] = b;
        partners[b.Index] = a;
        return new Steckers(partners);
    }

    public bool Equals(Steckers? other) => other is not null && _partners.SequenceEqual(other._partners);

    public override bool Equals(object? obj) => Equals(obj as Steckers);

    public override int GetHashCode() => ToString().GetHashCode(StringComparison.Ordinal);

    public override string ToString() => string.Join(' ', Pairs.Select(pair => $"{pair.First}{pair.Second}"));
}
