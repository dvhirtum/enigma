using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// Letter, bigram and trigram frequencies of Navy plain text, for scoring decrypts: half from the Navy corpus (the
/// bundled intercepts and the exercise templates), half from general German (<see cref="GermanSource"/>), both written
/// in Navy style. A letter's probability after two others is 0.6 × trigram + 0.3 × bigram + 0.1 × letter frequency.
/// </summary>
public static class LanguageModel
{
    public const double NavyWeight = 0.5;

    public const string GermanSource = LanguageCounts.GermanSource;

    private const int Pairs = Letter.Count * Letter.Count;

    private static readonly double[] LogProbabilities = Build();

    /// <summary>The log probability of a random letter, for comparing a decrypt with noise.</summary>
    public static double RandomLogProbability { get; } = -Math.Log(Letter.Count);

    /// <summary>The natural log of the probability of <paramref name="c"/> after <paramref name="a"/><paramref name="b"/>.</summary>
    public static double LogProbability(Letter a, Letter b, Letter c) =>
        LogProbabilities[(a.Index * Pairs) + (b.Index * Letter.Count) + c.Index];

    /// <summary>The mean log probability over every three known letters in a row, or null when there are none.</summary>
    public static double? Score(IReadOnlyList<Letter?> text)
    {
        ArgumentNullException.ThrowIfNull(text);

        var (sum, count) = (0.0, 0);
        for (var index = 2; index < text.Count; index++)
        {
            if (Window(text, index) is { } logProbability)
            {
                (sum, count) = (sum + logProbability, count + 1);
            }
        }

        return count == 0 ? null : sum / count;
    }

    /// <summary>The log probability of the letter at <paramref name="index"/> after the two before it, or null when one is unknown.</summary>
    public static double? Window(IReadOnlyList<Letter?> text, int index)
    {
        ArgumentNullException.ThrowIfNull(text);

        return index >= 2 && text[index - 2] is { } a && text[index - 1] is { } b && text[index] is { } c
            ? LogProbability(a, b, c)
            : null;
    }

    private static double[] Build()
    {
        var letters = Mix([Letters(LanguageCounts.NavyLetters)], [Letters(LanguageCounts.GermanLetters)])[0]!;
        var bigrams = Mix(Conditional(LanguageCounts.NavyBigrams), Conditional(LanguageCounts.GermanBigrams));
        var trigrams = Mix(Conditional(LanguageCounts.NavyTrigrams), Conditional(LanguageCounts.GermanTrigrams));

        var logProbabilities = new double[Pairs * Letter.Count];
        for (var ab = 0; ab < Pairs; ab++)
        {
            var b = ab % Letter.Count;
            for (var c = 0; c < Letter.Count; c++)
            {
                // A context never seen falls back to the shorter one.
                var letter = letters[c];
                var bigram = bigrams[b]?[c] ?? letter;
                var trigram = trigrams[ab]?[c] ?? bigram;
                logProbabilities[(ab * Letter.Count) + c] = Math.Log((0.6 * trigram) + (0.3 * bigram) + (0.1 * letter));
            }
        }

        return logProbabilities;
    }

    // Letter frequencies, add-one smoothed so that no letter is impossible.
    private static double[] Letters(ReadOnlySpan<int> counts)
    {
        var total = 0.0;
        foreach (var count in counts)
        {
            total += count + 1;
        }

        var frequencies = new double[Letter.Count];
        for (var c = 0; c < Letter.Count; c++)
        {
            frequencies[c] = (counts[c] + 1) / total;
        }

        return frequencies;
    }

    // The frequency of each last letter after each context, null for a context that never occurs.
    private static double[]?[] Conditional(ReadOnlySpan<int> counts)
    {
        var contexts = new double[]?[counts.Length / Letter.Count];
        for (var context = 0; context < contexts.Length; context++)
        {
            var row = counts.Slice(context * Letter.Count, Letter.Count);
            var total = 0.0;
            foreach (var count in row)
            {
                total += count;
            }

            if (total > 0)
            {
                var frequencies = new double[Letter.Count];
                for (var c = 0; c < Letter.Count; c++)
                {
                    frequencies[c] = row[c] / total;
                }

                contexts[context] = frequencies;
            }
        }

        return contexts;
    }

    // Weighs the Navy and German frequencies of each context; a context one source lacks takes the other's.
    private static double[]?[] Mix(double[]?[] navy, double[]?[] german) =>
        [.. navy.Zip(german, (n, g) => n is null ? g : g is null ? n
            : n.Zip(g, (x, y) => (NavyWeight * x) + ((1 - NavyWeight) * y)).ToArray())];
}
