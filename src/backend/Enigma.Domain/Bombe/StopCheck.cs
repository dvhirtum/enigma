using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

public enum StopVerdict
{
    Unchecked,
    True,
    False
}

public enum CribMatch
{
    Match,
    Mismatch,
    Unknown
}

/// <summary>A crib letter at its offset, and whether the steckers found so far encipher it to its cipher letter.</summary>
public sealed record CribLetterCheck(int Offset, Letter Plain, Letter Cipher, CribMatch Match);

/// <summary>
///     The key a checked stop gives: the right ring from the turnover, the left and middle rings at Z, or as read from
///     the indicator, the known plug pairs and the rotor positions the message starts from.
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
    IReadOnlyList<string> MissingPairs);

/// <summary>
///     The confirmation of a verdict: the crib offsets the steckers do not encipher correctly, the offsets still unknown,
///     and the comparison with the solution when the message has one.
/// </summary>
public sealed record CheckConfirmation(
    StopVerdict Verdict,
    IReadOnlyList<int> CribMismatches,
    IReadOnlyList<int> CribUnknown,
    SolutionComparison? Solution);

/// <summary>A proposed stecker (a letter with itself: unsteckered) and its gain in log likelihood.</summary>
public sealed record SuggestedPair(Letter First, Letter Second, double Gain)
{
    public override string ToString()
    {
        return First.Index <= Second.Index ? $"{First}{Second}" : $"{Second}{First}";
    }
}

/// <summary>
///     The proposed steckers in the order found, the steckers with them added and the decrypt they give, letters still
///     unknown taken as unsteckered.
/// </summary>
public sealed record SteckerSuggestion(
    IReadOnlyList<SuggestedPair> Pairs,
    Steckers Steckers,
    IReadOnlyList<Letter> Decrypt);

/// <summary>
///     A middle or right ring's decrypt score (null when the message is shorter than three letters), and whether it
///     is the best.
/// </summary>
public sealed record RingScore(RingSetting Ring, double? Score, bool Best);

/// <summary>
///     A row of the ring table: left and middle rings, the Spruchschlüssel the Verfahrenkenngruppe gives at the
///     Grundstellung with them, and the core positions it leads to at the start of the crib.
/// </summary>
public sealed record RingRow(RingSetting Left, RingSetting Middle, RotorPositions Spruchschluessel, DrumPosition Cores);

/// <summary>
///     The left and middle rings read from the indicator, with the Grundstellung and Verfahrenkenngruppe they were
///     read with.
/// </summary>
public sealed record IndicatorReading(
    RotorPositions Grundstellung,
    Kenngruppe Verfahrenkenngruppe,
    RingSetting Left,
    RingSetting Middle);

/// <summary>
///     The checking of a Bombe stop, worked on the checking machine (<see cref="CheckingMachine" />). The checker writes
///     down the steckers, turns the right ring (the core positions stay) to find the middle rotor's turnover, and gives a
///     verdict.
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
        Sheet = stop.Stecker is { } partner ? SteckerSheet.Empty.With(stop.TestRegister, partner) : SteckerSheet.Empty;
    }

    public BombeStop Stop { get; }

    public ReflectorType Reflector { get; }

    public CribPlacement Placement { get; }

    public WheelOrder WheelOrder => Stop.WheelOrder;

    /// <summary>The stecker sheet as written, contradictions and all.</summary>
    public SteckerSheet Sheet { get; set; }

    /// <summary>The steckers the sheet gives; a contradicted letter and its partners are unknown.</summary>
    public Steckers Steckers
    {
        get => Sheet.Steckers;
        set => Sheet = SteckerSheet.Of(value);
    }

    public RingSetting RightRing { get; set; } = RingSetting.FromChar('Z');

    /// <summary>The middle ring: it sets where the left rotor turns over in the message.</summary>
    public RingSetting MiddleRing { get; set; } = RingSetting.FromChar('Z');

    public StopVerdict Verdict { get; private set; }

    /// <summary>The steckers found by checking, as they stood when the stop was confirmed true; none otherwise.</summary>
    public Steckers Checked { get; private set; } = Steckers.None;

    /// <summary>The ring settings: left at Z, the middle and right ones as turned.</summary>
    public IReadOnlyList<RingSetting> Rings => [RingSetting.FromChar('Z'), MiddleRing, RightRing];

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

    /// <summary>The left and middle rings read from the indicator, or null.</summary>
    public IndicatorReading? Reading { get; set; }

    /// <summary>Whether the rings read lead to the stop's core positions at the crib; null before the rings are read.</summary>
    public bool? ReadingFitsStop =>
        Reading is { } reading
            ? Row(reading.Grundstellung, reading.Verfahrenkenngruppe, reading.Left, reading.Middle).Cores ==
              Stop.Position
            : null;

    /// <summary>
    ///     The whole key once the rings are read: the rings read and the right ring, the known plug pairs, and the
    ///     Spruchschlüssel of the reading's row as the message key. Null before the rings are read.
    /// </summary>
    public CheckedKey? ReadKey =>
        Reading is { } reading
            ? new CheckedKey(
                Reflector,
                WheelOrder,
                [reading.Left, reading.Middle, RightRing],
                Steckers.Plugs,
                Row(reading.Grundstellung, reading.Verfahrenkenngruppe, reading.Left, reading.Middle).Spruchschluessel)
            : null;

    /// <summary>
    ///     Writes down what a lamp of the checking machine says at <paramref name="core" />: at a crib link's position, when
    ///     <paramref name="key" /> is a partner written for one of its letters, the lamp is written as a partner of the
    ///     other, even when that contradicts the sheet. Returns whether anything was written.
    /// </summary>
    public bool Record(DrumPosition core, Letter key, Letter lamp)
    {
        if (Placement.Links.FirstOrDefault(link => Stop.Position.Advance(link.Offset) == core) is not
            { } link) return false;

        Letter? other = Sheet.PartnersOf(link.First).Contains(key) ? link.Second
            : Sheet.PartnersOf(link.Second).Contains(key) ? link.First
            : null;
        if (other is not { } letter) return false;

        Sheet = Sheet.With(letter, lamp);
        return true;
    }

    /// <summary>Each crib letter at the stop's core positions plus its offset, as the Bombe tested it.</summary>
    public IReadOnlyList<CribLetterCheck> Crib()
    {
        return
        [
            .. Placement.Links.Select(link =>
            {
                var (cipher, plain) = (link.First, link.Second);
                var match = Steckers.PartnerOf(plain) is { } input && Steckers.PartnerOf(cipher) is { } output
                    ? Scrambler.Encipher(WheelOrder, Reflector, Stop.Position.Advance(link.Offset), input) == output
                        ? CribMatch.Match
                        : CribMatch.Mismatch
                    : CribMatch.Unknown;
                return new CribLetterCheck(link.Offset, plain, cipher, match);
            })
        ];
    }

    /// <summary>
    ///     The 676 pairs of left and middle rings, left ring first, each with the Spruchschlüssel that typing
    ///     <paramref name="verfahrenkenngruppe" /> at <paramref name="grundstellung" /> gives on an Enigma with this check's
    ///     key (letters not known yet unsteckered), and the cores it leads to at the crib. The row with the stop's cores
    ///     gives the rings.
    /// </summary>
    public IReadOnlyList<RingRow> RingTable(RotorPositions grundstellung, Kenngruppe verfahrenkenngruppe)
    {
        ArgumentNullException.ThrowIfNull(grundstellung);

        var rings = Enumerable.Range(1, Letter.Count).Select(RingSetting.FromNumber).ToArray();
        return
            [.. from left in rings from middle in rings select Row(grundstellung, verfahrenkenngruppe, left, middle)];
    }

    /// <summary>Decrypts the message on an Enigma with <see cref="ReadKey" />; null before the rings are read.</summary>
    public string? ReadDecrypt()
    {
        return ReadKey is { } key
            ? new Solution(key.Reflector, key.WheelOrder, key.Rings, key.Plugs, key.MessageKey, string.Empty,
                string.Empty).Decrypt(Placement.CipherText)
            : null;
    }

    /// <summary>
    ///     How many letters the read key's decrypt reads differently from <see cref="Decrypt()" /> with the middle ring of the
    ///     check, or null before rings are read. Only where the left rotor turns over can the two differ; rings that do not
    ///     lead to the stop give another message key altogether, so they count 0.
    /// </summary>
    public int? ReadDifferences()
    {
        return ReadDecrypt() is not { } read ? null
            : ReadingFitsStop != true ? 0
            : Decrypt().Zip(read).Count(pair => pair.First.ToChar() != pair.Second);
    }

    private RingRow Row(RotorPositions grundstellung, Kenngruppe verfahrenkenngruppe, RingSetting left,
        RingSetting middle)
    {
        var key = new DailyKey(1, Reflector, [WheelOrder.Left, WheelOrder.Middle, WheelOrder.Right],
            [left, middle, RightRing], Steckers.Plugs);
        var spruchschluessel = KeyProcedure.MessageKey.Derive(key, grundstellung, verfahrenkenngruppe).Spruchschluessel;
        var start = spruchschluessel.Positions;
        var windows = (start[0].Letter, start[1].Letter, start[2].Letter);
        for (var press = 0; press < Placement.Position; press++) windows = WheelOrder.Step(windows);

        return new RingRow(left, middle, spruchschluessel, Core(windows, key.Rings));
    }

    /// <summary>
    ///     Decrypts the whole message on an Enigma with this key, the rotors stepping, taking letters whose steckers are
    ///     not known yet as unsteckered.
    /// </summary>
    public IReadOnlyList<Letter> Decrypt()
    {
        return DecryptAssumed(Steckers, MessageScrambles(MiddleRing, RightRing));
    }

    /// <summary>
    ///     Proposes steckers for the letters still unknown, one at a time, without changing the check. Each partner of an
    ///     unknown letter (itself included) that keeps the crib consistent gains the log likelihood of the decrypt letters
    ///     it makes known, against random letters. The letter whose best partner gains most is taken when that partner
    ///     gains and beats the letter's runner-up by <see cref="SuggestMargin" />. At most <see cref="MaxPlugs" /> plug pairs.
    /// </summary>
    public SteckerSuggestion Suggest()
    {
        var scrambles = MessageScrambles(MiddleRing, RightRing);
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

        return new SteckerSuggestion(pairs, steckers, DecryptAssumed(steckers, scrambles));
    }

    /// <summary>
    ///     Scores the decrypt with each right ring, the middle ring and the core positions kept and unknown letters taken as
    ///     unsteckered, by its gain against random letters, and sets the lowest ring with the best score. Rings that give
    ///     the same decrypt tie. When the message is too short to score, all tie and the ring stays.
    /// </summary>
    public IReadOnlyList<RingScore> FindRightRing()
    {
        var rings = Score(ring => MessageScrambles(MiddleRing, ring));
        if (rings.Any(ring => ring.Score is not null)) RightRing = rings.First(ring => ring.Best).Ring;

        return rings;
    }

    /// <summary>
    ///     Scores the decrypt with each middle ring, the right ring and the core positions kept, as
    ///     <see cref="FindRightRing" />
    ///     does, without setting it. The middle ring only changes the decrypt where the left rotor turns over.
    /// </summary>
    public IReadOnlyList<RingScore> MiddleRingScores()
    {
        return Score(ring => MessageScrambles(ring, RightRing));
    }

    /// <summary>Scores the middle rings as <see cref="MiddleRingScores" /> does, and sets the lowest with the best score.</summary>
    public IReadOnlyList<RingScore> FindMiddleRing()
    {
        var rings = MiddleRingScores();
        if (rings.Any(ring => ring.Score is not null)) MiddleRing = rings.First(ring => ring.Best).Ring;

        return rings;
    }

    /// <summary>Gives the verdict, and checks the crib and, when there is one, the solution.</summary>
    public CheckConfirmation Confirm(StopVerdict verdict, Solution? solution)
    {
        Verdict = verdict;
        Checked = verdict == StopVerdict.True ? Steckers : Steckers.None;
        var crib = Crib();
        return new CheckConfirmation(
            verdict,
            [.. crib.Where(letter => letter.Match == CribMatch.Mismatch).Select(letter => letter.Offset)],
            [.. crib.Where(letter => letter.Match == CribMatch.Unknown).Select(letter => letter.Offset)],
            solution is null ? null : Compare(solution));
    }

    private SolutionComparison Compare(Solution solution)
    {
        var windows = (solution.MessageKey.Positions[0].Letter, solution.MessageKey.Positions[1].Letter,
            solution.MessageKey.Positions[2].Letter);
        for (var press = 0; press < Placement.Position; press++) windows = solution.WheelOrder.Step(windows);

        var isTrue = solution.WheelOrder == WheelOrder
                     && solution.Reflector == Reflector
                     && Core(windows, solution.Rings) == Stop.Position;
        var partners = Enumerable.Range(0, Letter.Count).Select(Letter.FromIndex).ToArray();
        foreach (var plug in solution.Plugs)
            (partners[plug.First.Index], partners[plug.Second.Index]) = (plug.Second, plug.First);

        return new SolutionComparison(
            isTrue,
            Verdict == (isTrue ? StopVerdict.True : StopVerdict.False),
            [
                .. Steckers.Pairs.Where(pair => partners[pair.First.Index] != pair.Second)
                    .Select(pair => $"{pair.First}{pair.Second}")
            ],
            [
                .. solution.Plugs.Where(plug => Steckers.PartnerOf(plug.First) != plug.Second)
                    .Select(plug => plug.ToString())
            ]);
    }

    private static Letter?[] Decrypt(Steckers steckers, Letter[][] scrambles, IReadOnlyList<Letter> cipherText)
    {
        var plain = new Letter?[cipherText.Count];
        for (var index = 0; index < plain.Length; index++)
            plain[index] = steckers.PartnerOf(cipherText[index]) is { } input
                ? steckers.PartnerOf(scrambles[index][input.Index])
                : null;

        return plain;
    }

    private Letter?[] Decrypt(Steckers steckers, Letter[][] scrambles)
    {
        return Decrypt(steckers, scrambles, Placement.CipherText);
    }

    private Letter[] DecryptAssumed(Steckers steckers, Letter[][] scrambles)
    {
        return [.. Decrypt(steckers.WithUnknownUnsteckered(), scrambles).Select(letter => letter!.Value)];
    }

    // Scores the decrypt with each of the 26 rings, by the scrambles that ring gives.
    private RingScore[] Score(Func<RingSetting, Letter[][]> scramblesWith)
    {
        var scores = Enumerable.Range(1, Letter.Count)
            .Select(RingSetting.FromNumber)
            .Select(ring => (Ring: ring,
                Score: LanguageModel.Gain(Decrypt(Steckers.WithUnknownUnsteckered(), scramblesWith(ring)))))
            .ToArray();
        var best = scores.Max(ring => ring.Score ?? double.NegativeInfinity);
        return
        [
            .. scores.Select(ring =>
                new RingScore(ring.Ring, ring.Score, (ring.Score ?? double.NegativeInfinity) == best))
        ];
    }

    // The scrambler of each message letter with the middle and right rings, the rotors stepping: the output for each input.
    private Letter[][] MessageScrambles(RingSetting middleRing, RingSetting rightRing)
    {
        IReadOnlyList<RingSetting> rings = [RingSetting.FromChar('Z'), middleRing, rightRing];
        var windows = MessageStart(WindowsAtCrib(Stop.Position, rings), Placement.Position);
        var scrambles = new Letter[Placement.CipherText.Count][];
        for (var index = 0; index < scrambles.Length; index++)
        {
            windows = WheelOrder.Step(windows);
            scrambles[index] = Scramble(Core(windows, rings));
        }

        return scrambles;
    }

    private Letter[] Scramble(DrumPosition core)
    {
        return
        [
            .. Enumerable.Range(0, Letter.Count).Select(input =>
                Scrambler.Encipher(WheelOrder, Reflector, core, Letter.FromIndex(input)))
        ];
    }

    private SuggestedPair? BestPair(Steckers steckers, Letter[][] scrambles, (MenuLink Link, Letter[] Scramble)[] crib)
    {
        Letter[] unknown =
        [
            .. Enumerable.Range(0, Letter.Count).Select(Letter.FromIndex).Where(letter =>
                steckers.PartnerOf(letter) is null && Sheet.PartnersOf(letter).Count == 0)
        ];
        var plugsFull = steckers.Plugs.Count >= MaxPlugs;
        var decrypt = Decrypt(steckers, scrambles);
        SuggestedPair? best = null;
        foreach (var letter in unknown)
        {
            var candidates = unknown
                .Where(partner => partner == letter || !plugsFull)
                .Select(partner => (Partner: partner, Steckers: steckers.With(letter, partner)))
                .Where(candidate => crib.All(link => Consistent(candidate.Steckers, link.Link, link.Scramble)))
                .Select(candidate => new SuggestedPair(letter, candidate.Partner,
                    Gain(decrypt, Decrypt(candidate.Steckers, scrambles))))
                .OrderByDescending(candidate => candidate.Gain)
                .ToArray();
            if (candidates.Length == 0) continue;

            var runnerUp = candidates.Length > 1 ? candidates[1].Gain : double.NegativeInfinity;
            if (candidates[0].Gain > (best?.Gain ?? 0) && candidates[0].Gain - runnerUp >= SuggestMargin)
                best = candidates[0];
        }

        return best;
    }

    // The log likelihood against random letters of the windows the candidate decrypt makes known.
    private static double Gain(Letter?[] before, Letter?[] after)
    {
        var gain = 0.0;
        for (var index = 2; index < after.Length; index++)
            if (LanguageModel.Window(before, index) is null && LanguageModel.Window(after, index) is { } logProbability)
                gain += logProbability - LanguageModel.RandomLogProbability;

        return gain;
    }

    // Whether the steckers can still encipher a crib letter to its cipher letter, from either end of the link.
    private static bool Consistent(Steckers steckers, MenuLink link, Letter[] scramble)
    {
        return Agrees(steckers, link.Second, link.First, scramble) &&
               Agrees(steckers, link.First, link.Second, scramble);
    }

    private static bool Agrees(Steckers steckers, Letter from, Letter to, Letter[] scramble)
    {
        if (steckers.PartnerOf(from) is not { } input) return true;

        var output = scramble[input.Index];
        return (steckers.PartnerOf(output) is not { } partner || partner == to)
               && (steckers.PartnerOf(to) is not { } known || known == output);
    }

    private static (Letter Left, Letter Middle, Letter Right) WindowsAtCrib(DrumPosition core,
        IReadOnlyList<RingSetting> rings)
    {
        return (core.Left.Shift(rings[0].Letter.Index), core.Middle.Shift(rings[1].Letter.Index),
            core.Right.Shift(rings[2].Letter.Index));
    }

    private static DrumPosition Core((Letter Left, Letter Middle, Letter Right) windows,
        IReadOnlyList<RingSetting> rings)
    {
        return new DrumPosition(
            windows.Left.Shift(-rings[0].Letter.Index),
            windows.Middle.Shift(-rings[1].Letter.Index),
            windows.Right.Shift(-rings[2].Letter.Index));
    }

    // The window letters that step to the crib's after the letters before it are pressed.
    private (Letter, Letter, Letter) MessageStart((Letter Left, Letter Middle, Letter Right) atCrib, int presses)
    {
        var right = atCrib.Right.Shift(-presses);
        for (var back = 0; back < Letter.Count * Letter.Count; back++)
        {
            var start = (atCrib.Left.Shift(-(back / Letter.Count)), atCrib.Middle.Shift(-(back % Letter.Count)), right);
            var windows = start;
            for (var press = 0; press < presses; press++) windows = WheelOrder.Step(windows);

            if (windows == atCrib) return start;
        }

        return (atCrib.Left, atCrib.Middle, right);
    }
}
