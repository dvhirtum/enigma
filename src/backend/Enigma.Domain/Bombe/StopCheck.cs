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

/// <summary>
/// The checking of a Bombe stop, as on the Hut 8 checking machine: rotors and reflector without plugboard, which do not
/// step and are set by the Bombe drum letters. The checker writes down the steckers, turns the right ring (the core
/// positions stay) to find the middle rotor's turnover, and gives a verdict.
/// </summary>
public sealed class StopCheck
{
    public StopCheck(BombeStop stop, ReflectorType reflector, CribPlacement placement)
    {
        ArgumentNullException.ThrowIfNull(stop);
        ArgumentNullException.ThrowIfNull(reflector);
        ArgumentNullException.ThrowIfNull(placement);

        Stop = stop;
        Reflector = reflector;
        Placement = placement;
        MachinePosition = stop.DrumLetters;
        Steckers = stop.Stecker is { } partner ? Steckers.None.With(stop.TestRegister, partner) : Steckers.None;
    }

    public BombeStop Stop { get; }

    public ReflectorType Reflector { get; }

    public CribPlacement Placement { get; }

    public WheelOrder WheelOrder => Stop.WheelOrder;

    /// <summary>The drum letters the checking machine is set to.</summary>
    public DrumPosition MachinePosition { get; set; }

    public Steckers Steckers { get; set; }

    public RingSetting RightRing { get; set; } = RingSetting.FromChar('Z');

    public StopVerdict Verdict { get; private set; }

    /// <summary>The ring settings: left and middle at Z, the right one as turned.</summary>
    public IReadOnlyList<RingSetting> Rings => [RingSetting.FromChar('Z'), RingSetting.FromChar('Z'), RightRing];

    /// <summary>Presses <paramref name="key"/> on the checking machine and returns the lamp that lights.</summary>
    public Letter Press(Letter key) =>
        Scrambler.Encipher(WheelOrder, Reflector, WheelOrder.CorePositions(MachinePosition), key);

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
    public IReadOnlyList<Letter?> Decrypt()
    {
        var rings = Rings;
        var windows = MessageStart(WindowsAtCrib(Stop.Position, rings), Placement.Position);
        var plain = new List<Letter?>(Placement.CipherText.Count);
        foreach (var cipher in Placement.CipherText)
        {
            windows = Step(WheelOrder, windows);
            plain.Add(Steckers.PartnerOf(cipher) is { } input
                ? Steckers.PartnerOf(Scrambler.Encipher(WheelOrder, Reflector, Core(windows, rings), input))
                : null);
        }

        return plain;
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
