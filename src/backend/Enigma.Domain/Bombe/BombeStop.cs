using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>A drum position at which the test register did not show all 26 wires live.</summary>
public sealed record BombeStop(WheelOrder WheelOrder, DrumPosition Position, Letter TestRegister, IReadOnlyList<Letter> LiveWires)
{
    /// <summary>
    /// The stecker partner of the test register letter: the only live wire, or the only dead wire when 25 are live.
    /// Null for any other count.
    /// </summary>
    public Letter? Stecker => LiveWires.Count switch
    {
        1 => LiveWires[0],
        Letter.Count - 1 => Enumerable.Range(0, Letter.Count).Select(Letter.FromIndex).Except(LiveWires).Single(),
        _ => null,
    };
}
