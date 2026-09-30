using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// A Turing-Welchman Bombe plugged up with a menu. Each menu letter has a cable of 26 wires, one per possible stecker
/// partner; a scrambler for each link joins the cables of its two letters. At each drum position the input letter's
/// wire on the test register cable is made live, and the current spreads. Welchman's diagonal board joins wire b of
/// cable a to wire a of cable b, because steckering is mutual. The Bombe stops when not all 26 test register wires are
/// live.
/// </summary>
public sealed class BombeMachine
{
    private const int Wires = Letter.Count * Letter.Count;

    private readonly Scrambler _scrambler;
    private readonly (int Link, int Other)[][] _linksByLetter;
    private readonly DrumPosition[] _starts;

    /// <summary>
    /// A Bombe with a scrambler per menu link, each set to <paramref name="starts"/> (by default the letters of its
    /// link's offset: ZZA, ZZB, ...) when the run starts.
    /// </summary>
    public BombeMachine(Scrambler scrambler, Menu menu, Letter input, bool diagonalBoard = true, IReadOnlyList<DrumPosition>? starts = null)
    {
        ArgumentNullException.ThrowIfNull(scrambler);
        ArgumentNullException.ThrowIfNull(menu);

        _scrambler = scrambler;
        Menu = menu;
        Input = input;
        DiagonalBoard = diagonalBoard;
        _starts = [.. starts ?? menu.Links.Select(link => DrumPosition.FromOffset(link.Offset))];
        if (_starts.Length != menu.Links.Count)
        {
            throw new DomainException($"The menu has {menu.Links.Count} links but {_starts.Length} scramblers are set.");
        }

        _linksByLetter = [.. Enumerable.Range(0, Letter.Count).Select(letter => menu.Links
            .SelectMany((link, index) => new[] { (index, link.First, link.Second), (index, link.Second, link.First) })
            .Where(end => end.Item2.Index == letter)
            .Select(end => (end.index, end.Item3.Index))
            .ToArray())];
    }

    public WheelOrder WheelOrder => _scrambler.WheelOrder;

    public Menu Menu { get; }

    /// <summary>The menu letter whose cable the test register watches.</summary>
    public Letter TestRegister => Menu.TestRegister;

    /// <summary>The wire made live on the test register cable: the hypothesis that it is the stecker partner.</summary>
    public Letter Input { get; }

    public bool DiagonalBoard { get; }

    /// <summary>Tests one drum position; returns the stop, or null when all 26 test register wires are live.</summary>
    public BombeStop? Test(DrumPosition position)
    {
        var scramblers = _starts.Select(start => position.Advance(start).Offset).ToArray();
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
            foreach (var (link, other) in _linksByLetter[cable])
            {
                Energize(other, _scrambler.At(scramblers[link])[wire]);
            }

            if (DiagonalBoard)
            {
                Energize(wire, cable);
            }
        }

        if (testLive == Letter.Count)
        {
            return null;
        }

        var liveWires = Enumerable.Range(0, Letter.Count)
            .Where(wire => live[(TestRegister.Index * Letter.Count) + wire])
            .Select(Letter.FromIndex)
            .ToArray();
        return new BombeStop(WheelOrder, position, TestRegister, liveWires);
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
}
