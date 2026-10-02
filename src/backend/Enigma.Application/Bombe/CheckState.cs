using Enigma.Domain.Bombe;

namespace Enigma.Application.Bombe;

/// <summary>
///     The check of a stop: the stop, the stecker sheet as written (pairs such as "AD ET EX RR"), the letters it
///     contradicts (more than one partner), the steckers found by checking when the stop was confirmed true, the middle
///     and right rings (1–26), the verdict, each crib letter with its match (Match, Mismatch or Unknown), the decrypt of
///     the whole
///     message (letters not known yet taken as unsteckered), the key it gives, and the rings read from the indicator (null
///     before).
/// </summary>
public sealed record CheckState(
    StopState Stop,
    string Steckers,
    string Contradicted,
    string CheckedSteckers,
    int MiddleRing,
    int RightRing,
    string Verdict,
    IReadOnlyList<CribLetterState> Crib,
    string Decrypt,
    CheckedKeyState Key,
    ReadingState? Reading)
{
    /// <param name="solution">The solution of the message, to tell whether the rings read are right.</param>
    public static CheckState From(StopCheck check, int index, Solution? solution)
    {
        ArgumentNullException.ThrowIfNull(check);

        var key = check.Key;
        return new CheckState(
            StopState.From(check.Stop, index, check.Verdict),
            check.Sheet.ToString(),
            string.Concat(check.Sheet.Contradicted),
            check.Checked.ToString(),
            check.MiddleRing.Number,
            check.RightRing.Number,
            check.Verdict.ToString(),
            [
                .. check.Crib().Select(letter => new CribLetterState(
                    letter.Offset, letter.Plain.ToString(), letter.Cipher.ToString(), letter.Match.ToString()))
            ],
            string.Concat(check.Decrypt().Select(letter => letter.ToChar())),
            CheckedKeyState.From(key),
            check is { Reading: { } reading, ReadKey: { } read }
                ? new ReadingState(
                    reading.Left.Number,
                    reading.Middle.Number,
                    CheckedKeyState.From(read),
                    check.ReadDecrypt()!,
                    check.ReadingFitsStop == true,
                    check.ReadDifferences()!.Value,
                    solution is null ? null : solution.Rings[0] == reading.Left && solution.Rings[1] == reading.Middle)
                : null);
    }
}

public sealed record CribLetterState(int Offset, string Plain, string Cipher, string Match);

/// <summary>
///     The key a check gives: reflector, wheel order, ring settings (1–26; the left one stays 26 until the indicators are
///     read), plug pairs and the rotor positions the message starts from.
/// </summary>
public sealed record CheckedKeyState(
    string Reflector,
    string WheelOrder,
    IReadOnlyList<int> Rings,
    IReadOnlyList<string> Plugs,
    string MessageKey)
{
    public static CheckedKeyState From(CheckedKey key)
    {
        ArgumentNullException.ThrowIfNull(key);

        return new CheckedKeyState(
            key.Reflector.Name,
            key.WheelOrder.ToString(),
            [.. key.Rings.Select(ring => ring.Number)],
            [.. key.Plugs.Select(plug => plug.ToString())],
            key.MessageKey.ToString());
    }
}

/// <summary>
///     The left and middle rings (1–26) read from the indicator, the whole key they give (the Spruchschlüssel as the
///     message key), the decrypt with it, whether they lead to the stop's cores, how many letters the decrypt reads
///     differently from the check's decrypt (its middle ring), and whether the rings are the solution's (null without a
///     solution).
/// </summary>
public sealed record ReadingState(
    int Left,
    int Middle,
    CheckedKeyState Key,
    string Decrypt,
    bool FitsStop,
    int Differences,
    bool? RingsRight);

/// <summary>
///     The lamp a key lit, and the check of the stop the checking machine is set up for, with what the lamp wrote
///     down.
/// </summary>
public sealed record LampState(string Lamp, CheckState? Check);

/// <summary>
///     The confirmation of a verdict: the crib offsets that do not match and those still unknown, the comparison with the
///     message's solution (null when it has none) and the check as it now is.
/// </summary>
public sealed record ConfirmationState(
    string Verdict,
    IReadOnlyList<int> CribMismatches,
    IReadOnlyList<int> CribUnknown,
    ComparisonState? Solution,
    CheckState Check)
{
    public static ConfirmationState From(CheckConfirmation confirmation, CheckState check)
    {
        ArgumentNullException.ThrowIfNull(confirmation);

        return new ConfirmationState(
            confirmation.Verdict.ToString(),
            confirmation.CribMismatches,
            confirmation.CribUnknown,
            confirmation.Solution is { } solution
                ? new ComparisonState(solution.IsTrueStop, solution.VerdictCorrect, solution.WrongPairs,
                    solution.MissingPairs)
                : null,
            check);
    }
}

/// <summary>
///     How a verdict compares with the solution: whether the stop is the true one, whether the verdict is right, the pairs
///     entered that are wrong (self pairs included), and the plug pairs not entered yet.
/// </summary>
public sealed record ComparisonState(
    bool IsTrueStop,
    bool VerdictCorrect,
    IReadOnlyList<string> WrongPairs,
    IReadOnlyList<string> MissingPairs);

/// <summary>
///     Proposed steckers in the order found (a letter with itself: unsteckered), each with its gain in log likelihood; the
///     steckers with them added, to accept as they are; and the decrypt they give (letters still unknown taken as
///     unsteckered).
/// </summary>
public sealed record SuggestionState(IReadOnlyList<SuggestedPairState> Pairs, string Steckers, string Decrypt)
{
    public static SuggestionState From(SteckerSuggestion suggestion)
    {
        ArgumentNullException.ThrowIfNull(suggestion);

        return new SuggestionState(
            [.. suggestion.Pairs.Select(pair => new SuggestedPairState(pair.ToString(), pair.Gain))],
            suggestion.Steckers.ToString(),
            string.Concat(suggestion.Decrypt.Select(letter => letter.ToChar())));
    }
}

public sealed record SuggestedPairState(string Pair, double Gain);

/// <summary>
///     Each right ring (1–26) with its decrypt score (log likelihood against random letters, unknown letters taken as
///     unsteckered; null when the message is shorter than three letters) and whether it has the best score; more than one
///     best means the ring is not determined yet. The check has the lowest best ring set, or keeps its ring when no ring
///     has a score.
/// </summary>
public sealed record FindState(IReadOnlyList<RingScoreState> Rings, CheckState Check);

public sealed record RingScoreState(int Ring, double? Score, bool Best);
