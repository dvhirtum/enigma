using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// The stecker sheet written while checking a stop: every pair written down, contradictions and all, such as
/// "AD EP EX RR" (RR: R is unsteckered; E has two partners). A letter with more than one partner is contradicted.
/// </summary>
public sealed class SteckerSheet : IEquatable<SteckerSheet>
{
    private readonly (Letter First, Letter Second)[] _pairs;

    private SteckerSheet(IEnumerable<(Letter, Letter)> pairs) =>
        _pairs = [.. pairs
            .Select(pair => pair.Item1.Index <= pair.Item2.Index ? pair : (pair.Item2, pair.Item1))
            .Distinct()
            .OrderBy(pair => pair.Item1.Index)
            .ThenBy(pair => pair.Item2.Index)];

    public static SteckerSheet Empty { get; } = new([]);

    /// <summary>The pairs written, lower letter first, in alphabetical order.</summary>
    public IReadOnlyList<(Letter First, Letter Second)> Pairs => _pairs;

    /// <summary>The letters with more than one partner written.</summary>
    public IReadOnlyList<Letter> Contradicted =>
        [.. Enumerable.Range(0, Letter.Count).Select(Letter.FromIndex).Where(letter => PartnersOf(letter).Count > 1)];

    /// <summary>
    /// The steckers the sheet gives: the pairs whose letters both have only that partner. A contradicted letter and its
    /// partners stay unknown.
    /// </summary>
    public Steckers Steckers =>
        _pairs
            .Where(pair => PartnersOf(pair.First).Count == 1 && PartnersOf(pair.Second).Count == 1)
            .Aggregate(Steckers.None, (steckers, pair) => steckers.With(pair.First, pair.Second));

    public static SteckerSheet Of(Steckers steckers)
    {
        ArgumentNullException.ThrowIfNull(steckers);

        return new(steckers.Pairs);
    }

    /// <summary>Parses pairs such as "AD EP EX RR"; a letter may appear in more than one pair.</summary>
    public static SteckerSheet Parse(string pairs)
    {
        ArgumentNullException.ThrowIfNull(pairs);

        return new(pairs.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(pair =>
            pair.Length == 2
                ? (Letter.FromChar(pair[0]), Letter.FromChar(pair[1]))
                : throw new DomainException($"'{pair}' is not a stecker pair such as AD or RR.")));
    }

    /// <summary>The partners written for <paramref name="letter"/>, itself when unsteckered.</summary>
    public IReadOnlyList<Letter> PartnersOf(Letter letter) =>
        [.. _pairs.Where(pair => pair.First == letter || pair.Second == letter).Select(pair => pair.First == letter ? pair.Second : pair.First)];

    /// <summary>Writes the pair <paramref name="a"/>/<paramref name="b"/>, even when it contradicts the sheet.</summary>
    public SteckerSheet With(Letter a, Letter b) => new([.. _pairs, (a, b)]);

    /// <summary>Rubs out every pair with <paramref name="letter"/>.</summary>
    public SteckerSheet Without(Letter letter) => new(_pairs.Where(pair => pair.First != letter && pair.Second != letter));

    public bool Equals(SteckerSheet? other) => other is not null && _pairs.SequenceEqual(other._pairs);

    public override bool Equals(object? obj) => Equals(obj as SteckerSheet);

    public override int GetHashCode() => ToString().GetHashCode(StringComparison.Ordinal);

    public override string ToString() => string.Join(' ', _pairs.Select(pair => $"{pair.First}{pair.Second}"));
}
