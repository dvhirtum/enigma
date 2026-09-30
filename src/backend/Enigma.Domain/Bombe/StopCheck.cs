using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

public enum StopVerdict
{
    Unchecked,
    True,
    False,
}

public enum CribMatch
{
    Match,
    Mismatch,
    Unknown,
}

/// <summary>A crib letter at its offset, and whether the steckers found so far encipher it to its cipher letter.</summary>
public sealed record CribLetterCheck(int Offset, Letter Plain, Letter Cipher, CribMatch Match);

/// <summary>
/// The key a checked stop gives: the right ring from the turnover, the left and middle rings at Z (unknown until the
/// indicators are read), the known plug pairs and the rotor positions the message starts from.
/// </summary>
public sealed record CheckedKey(
    ReflectorType Reflector,
    WheelOrder WheelOrder,
    IReadOnlyList<RingSetting> Rings,
    IReadOnlyList<PlugPair> Plugs,
    RotorPositions MessageKey);

/// <summary>How the steckers and the verdict compare with the message's solution.</summary>
public sealed record SolutionComparison(
    bool IsTrueStop,
    bool VerdictCorrect,
    IReadOnlyList<string> WrongPairs,
    IReadOnlyList<string> MissingPairs,
    bool RightRingCorrect);

/// <summary>
/// The confirmation of a verdict: the crib offsets the steckers do not encipher correctly, the offsets still unknown,
/// and the comparison with the solution when the message has one.
/// </summary>
public sealed record CheckConfirmation(
    StopVerdict Verdict,
    IReadOnlyList<int> CribMismatches,
    IReadOnlyList<int> CribUnknown,
    SolutionComparison? Solution);

/// <summary>A proposed stecker (a letter with itself: unsteckered) and its gain in log likelihood.</summary>
public sealed record SuggestedPair(Letter First, Letter Second, double Gain)
{
    public override string ToString() => First.Index <= Second.Index ? $"{First}{Second}" : $"{Second}{First}";
}

/// <summary>The proposed steckers in the order found, the steckers with them added and the decrypt they give.</summary>
public sealed record SteckerSuggestion(IReadOnlyList<SuggestedPair> Pairs, Steckers Steckers, IReadOnlyList<Letter?> Decrypt);

/// <summary>A right ring's decrypt score (null when no three letters in a row are known), and whether it is the best.</summary>
public sealed record RingScore(RingSetting Ring, double? Score, bool Best);

/// <summary>
/// The checking of a Bombe stop, worked on the checking machine (<see cref="CheckingMachine"/>). The checker writes
/// down the steckers, turns the right ring (the core positions stay) to find the middle rotor's turnover, and gives a
/// verdict.
/// </summary>
public sealed class StopCheck
{
    /// <summary>The most plug pairs Suggest fills in, as on the Navy key sheets.</summary>
    public const int MaxPlugs = 10;

    /// <summary>How much a suggested partner must gain over the letter's runner-up, in natural log units.</summary>
    public const double SuggestMargin = 2.0;

    public StopCheck(BombeStop stop, ReflectorType reflector, CribPlacement placement)
    {
        ArgumentNullException.ThrowIfNull(stop);
        ArgumentNullException.ThrowIfNull(reflector);
        ArgumentNullException.ThrowIfNull(placement);

        Stop = stop;
        Reflector = reflector;
        Placement = placement;
        Steckers = stop.Stecker is { } partner ? Steckers.None.With(stop.TestRegister, partner) : Steckers.None;
    }

    public BombeStop Stop { get; }

    public ReflectorType Reflector { get; }

    public CribPlacement Placement { get; }

    public WheelOrder WheelOrder => Stop.WheelOrder;

    public Steckers Steckers { get; set; }

    public RingSetting RightRing { get; set; } = RingSetting.FromChar('Z');

    public StopVerdict Verdict { get; private set; }

    /// <summary>The ring settings: left and middle at Z, the right one as turned.</summary>
    public IReadOnlyList<RingSetting> Rings => [RingSetting.FromChar('Z'), RingSetting.FromChar('Z'), RightRing];

    /// <summary>Each crib letter at the stop's core positions plus its offset, as the Bombe tested it.</summary>
    public IReadOnlyList<CribLetterCheck> Crib() =>
        [.. Placement.Links.Select(link =>
        {
            var (cipher, plain) = (link.First, link.Second);
            var match = Steckers.PartnerOf(plain) is { } input && Steckers.PartnerOf(cipher) is { } output
                ? Scrambler.Encipher(WheelOrder, Reflector, Stop.Position.Advance(link.Offset), input) == output
                    ? CribMatch.Match
                    : CribMatch.Mismatch
                : CribMatch.Unknown;
            return new CribLetterCheck(link.Offset, plain, cipher, match);
        })];

    /// <summary>The rotor positions the message starts from, with the rotors stepping as on the Enigma.</summary>
    public RotorPositions MessageKey
    {
        get
        {
            var (left, middle, right) = MessageStart(WindowsAtCrib(Stop.Position, Rings), Placement.Position);
            return new RotorPositions([new RotorPosition(left), new RotorPosition(middle), new RotorPosition(right)]);
        }
    }

    public CheckedKey Key => new(Reflector, WheelOrder, Rings, Steckers.Plugs, MessageKey);

    /// <summary>
    /// Decrypts the whole message on an Enigma with this key, the rotors stepping. A letter is null where a stecker
    /// it needs is not known yet.
    /// </summary>
    public IReadOnlyList<Letter?> Decrypt() => Decrypt(Steckers, MessageScrambles(RightRing));

    /// <summary>
    /// Proposes steckers for the letters still unknown, one at a time, without changing the check. Each partner of an
    /// unknown letter (itself included) that keeps the crib consistent gains the log likelihood of the decrypt letters
    /// it makes known, against random letters. The letter whose best partner gains most is taken when that partner
    /// gains and beats the letter's runner-up by <see cref="SuggestMargin"/>. At most <see cref="MaxPlugs"/> plug pairs.
    /// </summary>
    public SteckerSuggestion Suggest()
    {
        var scrambles = MessageScrambles(RightRing);
        var crib = Placement.Links
            .Select(link => (Link: link, Scramble: Scramble(Stop.Position.Advance(link.Offset))))
            .ToArray();
        var steckers = Steckers;
        var pairs = new List<SuggestedPair>();
        while (BestPair(steckers, scrambles, crib) is { } pair)
        {
            steckers = steckers.With(pair.First, pair.Second);
            pairs.Add(pair);
        }

        return new SteckerSuggestion(pairs, steckers, Decrypt(steckers, scrambles));
    }

    /// <summary>
    /// Scores the decrypt with each right ring, the core positions kept, by its gain against random letters, and sets
    /// the lowest ring with the best score. Rings that give the same decrypt tie. When no ring has three known letters
    /// in a row, all tie and the ring stays.
    /// </summary>
    public IReadOnlyList<RingScore> FindRightRing()
    {
        var scores = Enumerable.Range(1, Letter.Count)
            .Select(RingSetting.FromNumber)
            .Select(ring => (Ring: ring, Score: LanguageModel.Gain(Decrypt(Steckers, MessageScrambles(ring)))))
            .ToArray();
        var best = scores.Max(ring => ring.Score ?? double.NegativeInfinity);
        RingScore[] rings = [.. scores.Select(ring => new RingScore(ring.Ring, ring.Score, (ring.Score ?? double.NegativeInfinity) == best))];
        if (!double.IsNegativeInfinity(best))
        {
            RightRing = rings.First(ring => ring.Best).Ring;
        }

        return rings;
    }

    /// <summary>Gives the verdict, and checks the crib and, when there is one, the solution.</summary>
    public CheckConfirmation Confirm(StopVerdict verdict, Solution? solution)
    {
        Verdict = verdict;
        var crib = Crib();
        return new CheckConfirmation(
            verdict,
            [.. crib.Where(letter => letter.Match == CribMatch.Mismatch).Select(letter => letter.Offset)],
            [.. crib.Where(letter => letter.Match == CribMatch.Unknown).Select(letter => letter.Offset)],
            solution is null ? null : Compare(solution));
    }

    private SolutionComparison Compare(Solution solution)
    {
        var windows = (solution.MessageKey.Positions[0].Letter, solution.MessageKey.Positions[1].Letter, solution.MessageKey.Positions[2].Letter);
        for (var press = 0; press < Placement.Position; press++)
        {
            windows = Step(solution.WheelOrder, windows);
        }

        var isTrue = solution.WheelOrder == WheelOrder
            && solution.Reflector == Reflector
            && Core(windows, solution.Rings) == Stop.Position;
        var partners = Enumerable.Range(0, Letter.Count).Select(Letter.FromIndex).ToArray();
        foreach (var plug in solution.Plugs)
        {
            (partners[plug.First.Index], partners[plug.Second.Index]) = (plug.Second, plug.First);
        }

        return new SolutionComparison(
            isTrue,
            Verdict == (isTrue ? StopVerdict.True : StopVerdict.False),
            [.. Steckers.Pairs.Where(pair => partners[pair.First.Index] != pair.Second).Select(pair => $"{pair.First}{pair.Second}")],
            [.. solution.Plugs.Where(plug => Steckers.PartnerOf(plug.First) != plug.Second).Select(plug => plug.ToString())],
            solution.Rings[2] == RightRing);
    }

    private static Letter?[] Decrypt(Steckers steckers, Letter[][] scrambles, IReadOnlyList<Letter> cipherText)
    {
        var plain = new Letter?[cipherText.Count];
        for (var index = 0; index < plain.Length; index++)
        {
            plain[index] = steckers.PartnerOf(cipherText[index]) is { } input
                ? steckers.PartnerOf(scrambles[index][input.Index])
                : null;
        }

        return plain;
    }

    private Letter?[] Decrypt(Steckers steckers, Letter[][] scrambles) => Decrypt(steckers, scrambles, Placement.CipherText);

    // The scrambler of each message letter with the right ring, the rotors stepping: the output for each input.
    private Letter[][] MessageScrambles(RingSetting rightRing)
    {
        IReadOnlyList<RingSetting> rings = [RingSetting.FromChar('Z'), RingSetting.FromChar('Z'), rightRing];
        var windows = MessageStart(WindowsAtCrib(Stop.Position, rings), Placement.Position);
        var scrambles = new Letter[Placement.CipherText.Count][];
        for (var index = 0; index < scrambles.Length; index++)
        {
            windows = Step(WheelOrder, windows);
            scrambles[index] = Scramble(Core(windows, rings));
        }

        return scrambles;
    }

    private Letter[] Scramble(DrumPosition core) =>
        [.. Enumerable.Range(0, Letter.Count).Select(input => Scrambler.Encipher(WheelOrder, Reflector, core, Letter.FromIndex(input)))];

    private SuggestedPair? BestPair(Steckers steckers, Letter[][] scrambles, (MenuLink Link, Letter[] Scramble)[] crib)
    {
        Letter[] unknown = [.. Enumerable.Range(0, Letter.Count).Select(Letter.FromIndex).Where(letter => steckers.PartnerOf(letter) is null)];
        var plugsFull = steckers.Plugs.Count >= MaxPlugs;
        var decrypt = Decrypt(steckers, scrambles);
        SuggestedPair? best = null;
        foreach (var letter in unknown)
        {
            var candidates = unknown
                .Where(partner => partner == letter || !plugsFull)
                .Select(partner => (Partner: partner, Steckers: steckers.With(letter, partner)))
                .Where(candidate => crib.All(link => Consistent(candidate.Steckers, link.Link, link.Scramble)))
                .Select(candidate => new SuggestedPair(letter, candidate.Partner, Gain(decrypt, Decrypt(candidate.Steckers, scrambles))))
                .OrderByDescending(candidate => candidate.Gain)
                .ToArray();
            if (candidates.Length == 0)
            {
                continue;
            }

            var runnerUp = candidates.Length > 1 ? candidates[1].Gain : double.NegativeInfinity;
            if (candidates[0].Gain > (best?.Gain ?? 0) && candidates[0].Gain - runnerUp >= SuggestMargin)
            {
                best = candidates[0];
            }
        }

        return best;
    }

    // The log likelihood against random letters of the windows the candidate decrypt makes known.
    private static double Gain(Letter?[] before, Letter?[] after)
    {
        var gain = 0.0;
        for (var index = 2; index < after.Length; index++)
        {
            if (LanguageModel.Window(before, index) is null && LanguageModel.Window(after, index) is { } logProbability)
            {
                gain += logProbability - LanguageModel.RandomLogProbability;
            }
        }

        return gain;
    }

    // Whether the steckers can still encipher a crib letter to its cipher letter, from either end of the link.
    private static bool Consistent(Steckers steckers, MenuLink link, Letter[] scramble) =>
        Agrees(steckers, link.Second, link.First, scramble) && Agrees(steckers, link.First, link.Second, scramble);

    private static bool Agrees(Steckers steckers, Letter from, Letter to, Letter[] scramble)
    {
        if (steckers.PartnerOf(from) is not { } input)
        {
            return true;
        }

        var output = scramble[input.Index];
        return (steckers.PartnerOf(output) is not { } partner || partner == to)
            && (steckers.PartnerOf(to) is not { } known || known == output);
    }

    private static (Letter Left, Letter Middle, Letter Right) WindowsAtCrib(DrumPosition core, IReadOnlyList<RingSetting> rings) =>
        (core.Left.Shift(rings[0].Letter.Index), core.Middle.Shift(rings[1].Letter.Index), core.Right.Shift(rings[2].Letter.Index));

    private static DrumPosition Core((Letter Left, Letter Middle, Letter Right) windows, IReadOnlyList<RingSetting> rings) =>
        new(
            windows.Left.Shift(-rings[0].Letter.Index),
            windows.Middle.Shift(-rings[1].Letter.Index),
            windows.Right.Shift(-rings[2].Letter.Index));

    // The window letters that step to the crib's after the letters before it are pressed.
    private (Letter, Letter, Letter) MessageStart((Letter Left, Letter Middle, Letter Right) atCrib, int presses)
    {
        var right = atCrib.Right.Shift(-presses);
        for (var back = 0; back < Letter.Count * Letter.Count; back++)
        {
            var start = (atCrib.Left.Shift(-(back / Letter.Count)), atCrib.Middle.Shift(-(back % Letter.Count)), right);
            var windows = start;
            for (var press = 0; press < presses; press++)
            {
                windows = Step(WheelOrder, windows);
            }

            if (windows == atCrib)
            {
                return start;
            }
        }

        return (atCrib.Left, atCrib.Middle, right);
    }

    // Steps the rotors as on the Enigma, with the middle rotor's double step.
    private static (Letter Left, Letter Middle, Letter Right) Step(WheelOrder order, (Letter Left, Letter Middle, Letter Right) windows)
    {
        var middleAtNotch = order.Middle.Notches.Contains(new RotorPosition(windows.Middle));
        var rightAtNotch = order.Right.Notches.Contains(new RotorPosition(windows.Right));
        return (
            middleAtNotch ? windows.Left.Shift(1) : windows.Left,
            middleAtNotch || rightAtNotch ? windows.Middle.Shift(1) : windows.Middle,
            windows.Right.Shift(1));
    }
}
