using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>A scrambler cabled between the commons of two letters, with its drums set to <paramref name="Start"/> when a run starts.</summary>
public sealed record CabledScrambler(Letter First, Letter Second, Scrambler Scrambler, DrumPosition Start);

/// <summary>
/// A Turing-Welchman Bombe plugged up with scramblers. Each letter has a cable of 26 wires, one per possible stecker
/// partner; a scrambler joins the cables of its two letters. At each drum position the input letter's wire on the test
/// register cable is made live, and the current spreads. Welchman's diagonal board joins wire b of cable a to wire a of
/// cable b, because steckering is mutual. The Bombe stops when not all 26 test register wires are live.
/// </summary>
public sealed class BombeMachine
{
    private const int Wires = Letter.Count * Letter.Count;

    private readonly CabledScrambler[] _scramblers;
    private readonly (int Scrambler, int Other)[][] _scramblersByLetter;
    private readonly WheelOrder? _wheelOrder;

    /// <summary>
    /// A Bombe plugged up with a menu: a scrambler per menu link, each set to <paramref name="starts"/> (by default the
    /// letters of its link's offset: ZZA, ZZB, ...) when the run starts.
    /// </summary>
    public BombeMachine(Scrambler scrambler, Menu menu, Letter input, bool diagonalBoard = true, IReadOnlyList<DrumPosition>? starts = null)
        : this(Cable(scrambler, menu, starts), menu.TestRegister, input, diagonalBoard) =>
        _wheelOrder = scrambler.WheelOrder;

    /// <summary>A Bombe plugged up by hand, with the test register on <paramref name="testRegister"/>'s common.</summary>
    public BombeMachine(IReadOnlyList<CabledScrambler> scramblers, Letter testRegister, Letter input, bool diagonalBoard = true)
    {
        ArgumentNullException.ThrowIfNull(scramblers);

        _scramblers = [.. scramblers];
        TestRegister = testRegister;
        Input = input;
        DiagonalBoard = diagonalBoard;
        _scramblersByLetter = [.. Enumerable.Range(0, Letter.Count).Select(letter => _scramblers
            .SelectMany((cabled, index) => new[] { (index, cabled.First, cabled.Second), (index, cabled.Second, cabled.First) })
            .Where(end => end.Item2.Index == letter)
            .Select(end => (end.index, end.Item3.Index))
            .ToArray())];
    }

    /// <summary>The wheel order of a Bombe plugged up with a menu.</summary>
    public WheelOrder WheelOrder => _wheelOrder ?? throw new InvalidOperationException("This Bombe was plugged up by hand.");

    /// <summary>The letter whose cable the test register watches.</summary>
    public Letter TestRegister { get; }

    /// <summary>The wire made live on the test register cable: the hypothesis that it is the stecker partner.</summary>
    public Letter Input { get; }

    public bool DiagonalBoard { get; }

    /// <summary>Tests one core position of a Bombe plugged up with a menu; returns the stop, or null when all 26 test register wires are live.</summary>
    public BombeStop? Test(DrumPosition position) =>
        LiveWiresAt(WheelOrder.DrumLetters(position)) is { } live ? new BombeStop(WheelOrder, position, TestRegister, live) : null;

    /// <summary>
    /// The live test register wires when the upper drums show <paramref name="drumLetters"/>, or null when all 26 are
    /// live. Each scrambler is that far on from its start letters.
    /// </summary>
    public IReadOnlyList<Letter>? LiveWiresAt(DrumPosition drumLetters)
    {
        var offsets = _scramblers
            .Select(cabled => cabled.Scrambler.WheelOrder.CorePositions(drumLetters.Advance(cabled.Start)).Offset)
            .ToArray();
        var live = new bool[Wires];
        var pending = new Stack<int>();
        var testLive = 0;

        void Energize(int cable, int wire)
        {
            var node = (cable * Letter.Count) + wire;
            if (live[node])
            {
                return;
            }

            live[node] = true;
            pending.Push(node);
            if (cable == TestRegister.Index)
            {
                testLive++;
            }
        }

        Energize(TestRegister.Index, Input.Index);
        while (pending.Count > 0 && testLive < Letter.Count)
        {
            var node = pending.Pop();
            var (cable, wire) = Math.DivRem(node, Letter.Count);
            foreach (var (scrambler, other) in _scramblersByLetter[cable])
            {
                Energize(other, _scramblers[scrambler].Scrambler.At(offsets[scrambler])[wire]);
            }

            if (DiagonalBoard)
            {
                Energize(wire, cable);
            }
        }

        return testLive == Letter.Count
            ? null
            : [.. Enumerable.Range(0, Letter.Count)
                .Where(wire => live[(TestRegister.Index * Letter.Count) + wire])
                .Select(Letter.FromIndex)];
    }

    /// <summary>
    /// Tests all 17,576 drum positions, with the upper drums from ZZZ, in the order the Bombe runs through them: the
    /// upper (left) drum turns fastest, and the middle and lower drums move on once per turn of the drum above.
    /// </summary>
    public IEnumerable<BombeStop> Run()
    {
        for (var step = 0; step < DrumPosition.Count; step++)
        {
            if (Test(WheelOrder.CorePositions(PositionAt(step))) is { } stop)
            {
                yield return stop;
            }
        }
    }

    /// <summary>The letters the upper drums show at <paramref name="step"/> (0 to 17,575) of a run.</summary>
    public static DrumPosition PositionAt(int step)
    {
        const int Square = Letter.Count * Letter.Count;
        var (upper, rest) = (step % Letter.Count, step / Letter.Count);
        return DrumPosition.FromOffset((upper * Square) + ((rest % Letter.Count) * Letter.Count) + (rest / Letter.Count));
    }

    private static CabledScrambler[] Cable(Scrambler scrambler, Menu menu, IReadOnlyList<DrumPosition>? starts)
    {
        ArgumentNullException.ThrowIfNull(scrambler);
        ArgumentNullException.ThrowIfNull(menu);

        DrumPosition[] positions = [.. starts ?? menu.Links.Select(link => DrumPosition.FromOffset(link.Offset))];
        return positions.Length == menu.Links.Count
            ? [.. menu.Links.Zip(positions, (link, start) => new CabledScrambler(link.First, link.Second, scrambler, start))]
            : throw new DomainException($"The menu has {menu.Links.Count} links but {positions.Length} scramblers are set.");
    }
}
