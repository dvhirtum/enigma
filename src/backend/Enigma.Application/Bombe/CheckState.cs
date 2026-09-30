using Enigma.Domain.Bombe;

namespace Enigma.Application.Bombe;

/// <summary>
/// The check of a stop: the stop, the checking machine's drum letters, the steckers found (pairs such as "AD ET RR"),
/// the right ring (1–26), the verdict, each crib letter with its match (Match, Mismatch or Unknown), the decrypt of the
/// whole message ('?' where a stecker is not known yet) and the key it gives.
/// </summary>
public sealed record CheckState(
    StopState Stop,
    string Position,
    string Steckers,
    int RightRing,
    string Verdict,
    IReadOnlyList<CribLetterState> Crib,
    string Decrypt,
    CheckedKeyState Key)
{
    public static CheckState From(StopCheck check, int index, BombeRun run)
    {
        ArgumentNullException.ThrowIfNull(check);
        ArgumentNullException.ThrowIfNull(run);

        var key = check.Key;
        return new CheckState(
            StopState.From(check.Stop, index, check.Verdict),
            check.MachinePosition.ToString(),
            check.Steckers.ToString(),
            check.RightRing.Number,
            check.Verdict.ToString(),
            [.. check.Crib().Select(letter => new CribLetterState(
                letter.Offset, letter.Plain.ToString(), letter.Cipher.ToString(), letter.Match.ToString()))],
            string.Concat(check.Decrypt().Select(letter => letter?.ToChar() ?? '?')),
            new CheckedKeyState(
                key.Reflector.Name,
                key.WheelOrder.ToString(),
                [.. key.Rings.Select(ring => ring.Number)],
                [.. key.Plugs.Select(plug => plug.ToString())],
                key.MessageKey.ToString()));
    }
}

public sealed record CribLetterState(int Offset, string Plain, string Cipher, string Match);

/// <summary>
/// The key a check gives: reflector, wheel order, ring settings (1–26; left and middle stay 26 until the indicators are
/// read), plug pairs and the rotor positions the message starts from.
/// </summary>
public sealed record CheckedKeyState(string Reflector, string WheelOrder, IReadOnlyList<int> Rings, IReadOnlyList<string> Plugs, string MessageKey);

public sealed record LampState(string Lamp);

/// <summary>
/// The confirmation of a verdict: the crib offsets that do not match and those still unknown, the comparison with the
/// message's solution (null when it has none) and the check as it now is.
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
                ? new ComparisonState(solution.IsTrueStop, solution.VerdictCorrect, solution.WrongPairs, solution.MissingPairs, solution.RightRingCorrect)
                : null,
            check);
    }
}

/// <summary>
/// How a verdict compares with the solution: whether the stop is the true one, whether the verdict is right, the pairs
/// entered that are wrong (self pairs included), the plug pairs not entered yet, and whether the right ring is right.
/// </summary>
public sealed record ComparisonState(bool IsTrueStop, bool VerdictCorrect, IReadOnlyList<string> WrongPairs, IReadOnlyList<string> MissingPairs, bool RightRingCorrect);

/// <summary>
/// Proposed steckers in the order found (a letter with itself: unsteckered), each with its gain in log likelihood; the
/// steckers with them added, to accept as they are; and the decrypt they give ('?' where still unknown).
/// </summary>
public sealed record SuggestionState(IReadOnlyList<SuggestedPairState> Pairs, string Steckers, string Decrypt)
{
    public static SuggestionState From(SteckerSuggestion suggestion)
    {
        ArgumentNullException.ThrowIfNull(suggestion);

        return new SuggestionState(
            [.. suggestion.Pairs.Select(pair => new SuggestedPairState(pair.ToString(), pair.Gain))],
            suggestion.Steckers.ToString(),
            string.Concat(suggestion.Decrypt.Select(letter => letter?.ToChar() ?? '?')));
    }
}

public sealed record SuggestedPairState(string Pair, double Gain);

/// <summary>
/// Each right ring (1–26) with its decrypt score (mean log probability; null when no three letters in a row are known)
/// and whether it has the best score; more than one best means the ring is not determined yet. The check has the
/// lowest best ring set.
/// </summary>
public sealed record FindState(IReadOnlyList<RingScoreState> Rings, CheckState Check);

public sealed record RingScoreState(int Ring, double? Score, bool Best);
