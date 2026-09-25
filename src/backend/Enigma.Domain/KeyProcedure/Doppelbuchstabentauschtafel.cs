using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>Two letters, such as a vertical pair of the indicator.</summary>
public readonly record struct Bigram(Letter First, Letter Second)
{
    public const int Count = Letter.Count * Letter.Count;

    public int Index => (First.Index * Letter.Count) + Second.Index;

    public static Bigram FromIndex(int index) =>
        index is >= 0 and < Count
            ? new Bigram(Letter.FromIndex(index / Letter.Count), Letter.FromIndex(index % Letter.Count))
            : throw new DomainException($"Bigram index {index} is outside 0–{Count - 1}.");

    public static Bigram Parse(string value)
    {
        ArgumentNullException.ThrowIfNull(value);

        return value.Length == 2
            ? new Bigram(Letter.FromChar(value[0]), Letter.FromChar(value[1]))
            : throw new DomainException($"'{value}' is not a bigram of two letters.");
    }

    public override string ToString() => $"{First}{Second}";
}

/// <summary>A bigram table: swaps every one of the 676 bigrams with another, both ways.</summary>
public sealed class Doppelbuchstabentauschtafel
{
    private readonly int[] _swaps;

    /// <summary>Builds table <paramref name="number"/> from 338 swaps that together cover every bigram once.</summary>
    public Doppelbuchstabentauschtafel(int number, IEnumerable<(Bigram A, Bigram B)> swaps)
    {
        ArgumentNullException.ThrowIfNull(swaps);

        _swaps = Enumerable.Repeat(-1, Bigram.Count).ToArray();
        foreach (var (a, b) in swaps)
        {
            if (a == b)
            {
                throw new DomainException($"Tauschtafel {number}: {a} cannot be swapped with itself.");
            }

            if (_swaps[a.Index] >= 0 || _swaps[b.Index] >= 0)
            {
                throw new DomainException($"Tauschtafel {number}: {(_swaps[a.Index] >= 0 ? a : b)} is swapped more than once.");
            }

            _swaps[a.Index] = b.Index;
            _swaps[b.Index] = a.Index;
        }

        if (Array.IndexOf(_swaps, -1) is var missing and >= 0)
        {
            throw new DomainException($"Tauschtafel {number}: {Bigram.FromIndex(missing)} has no swap.");
        }

        Number = number;
    }

    public int Number { get; }

    /// <summary>Each swap once, with the lower bigram first, in alphabetical order.</summary>
    public IReadOnlyList<(Bigram A, Bigram B)> Swaps =>
        [.. Enumerable.Range(0, Bigram.Count).Where(i => i < _swaps[i]).Select(i => (Bigram.FromIndex(i), Bigram.FromIndex(_swaps[i])))];

    public static Doppelbuchstabentauschtafel Generate(int number, Random random)
    {
        ArgumentNullException.ThrowIfNull(random);

        var bigrams = Enumerable.Range(0, Bigram.Count).Select(Bigram.FromIndex).ToArray();
        random.Shuffle(bigrams);
        return new Doppelbuchstabentauschtafel(number, bigrams.Chunk(2).Select(p => (p[0], p[1])));
    }

    public Bigram Swap(Bigram bigram) => Bigram.FromIndex(_swaps[bigram.Index]);
}
