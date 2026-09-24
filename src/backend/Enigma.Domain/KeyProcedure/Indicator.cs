using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>The two 4-letter indicator groups sent at the start and the end of a message.</summary>
public sealed record IndicatorGroups(string First, string Second)
{
    public static IndicatorGroups Parse(string first, string second)
    {
        ArgumentNullException.ThrowIfNull(first);
        ArgumentNullException.ThrowIfNull(second);

        return first.Length == 4 && second.Length == 4 && (first + second).All(char.IsAsciiLetter)
            ? new IndicatorGroups(first.ToUpperInvariant(), second.ToUpperInvariant())
            : throw new DomainException($"'{first} {second}' are not two indicator groups of 4 letters.");
    }

    public override string ToString() => $"{First} {Second}";
}

/// <summary>
/// The unencrypted indicator: the Schlüsselkenngruppe with a filler letter in front, written above the
/// Verfahrenkenngruppe with a filler letter behind. Swapping the vertical bigrams encrypts it.
/// </summary>
public sealed record Indicator(Kenngruppe Schluesselkenngruppe, Kenngruppe Verfahrenkenngruppe, Letter FillerBefore, Letter FillerAfter)
{
    /// <summary>The four vertical bigrams, left to right.</summary>
    public IReadOnlyList<Bigram> Bigrams
    {
        get
        {
            Letter[] top = [FillerBefore, .. Schluesselkenngruppe.Letters];
            Letter[] bottom = [.. Verfahrenkenngruppe.Letters, FillerAfter];
            return [.. top.Zip(bottom, (t, b) => new Bigram(t, b))];
        }
    }

    public IndicatorGroups Encrypt(Doppelbuchstabentauschtafel table)
    {
        ArgumentNullException.ThrowIfNull(table);

        var swapped = Bigrams.Select(table.Swap).ToList();
        return new IndicatorGroups(
            string.Concat(swapped.Select(b => b.First.ToString())),
            string.Concat(swapped.Select(b => b.Second.ToString())));
    }

    public static Indicator Decrypt(IndicatorGroups groups, Doppelbuchstabentauschtafel table)
    {
        ArgumentNullException.ThrowIfNull(groups);
        ArgumentNullException.ThrowIfNull(table);

        var bigrams = groups.First.Zip(groups.Second, (t, b) => table.Swap(new Bigram(Letter.FromChar(t), Letter.FromChar(b)))).ToList();
        return new Indicator(
            Kenngruppe.FromLetters(bigrams[1].First, bigrams[2].First, bigrams[3].First),
            Kenngruppe.FromLetters(bigrams[0].Second, bigrams[1].Second, bigrams[2].Second),
            bigrams[0].First,
            bigrams[3].Second);
    }
}
