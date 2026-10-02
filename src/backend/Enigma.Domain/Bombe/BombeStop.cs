using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>A drum position at which the test register did not show all 26 wires live.</summary>
public sealed record BombeStop(
    WheelOrder WheelOrder,
    DrumPosition Position,
    Letter TestRegister,
    IReadOnlyList<Letter> LiveWires)
{
    /// <summary>The letters the drums show at the stop.</summary>
    public DrumPosition DrumLetters => WheelOrder.DrumLetters(Position);

    /// <summary>The indicator drum reading at the stop.</summary>
    public DrumPosition Indicator => DrumLetters.Indicator;

    /// <summary>
    ///     The stecker partner of the test register letter: the only live wire, or the only dead wire when 25 are live.
    ///     Null for any other count.
    /// </summary>
    public Letter? Stecker => PartnerOf(LiveWires);

    /// <summary>The only live wire, or the only dead wire when 25 are live; null for any other count.</summary>
    public static Letter? PartnerOf(IReadOnlyList<Letter> liveWires)
    {
        ArgumentNullException.ThrowIfNull(liveWires);

        return liveWires.Count switch
        {
            1 => liveWires[0],
            Letter.Count - 1 => Enumerable.Range(0, Letter.Count).Select(Letter.FromIndex).Except(liveWires).Single(),
            _ => null
        };
    }
}

/// <summary>
///     A stop as the Bombe prints it: the chains that stopped, their wheel order (null when a row has no drums), the
///     letters
///     the upper drums show, the test register letter and its live wires.
/// </summary>
public sealed record PrintedStop(
    IReadOnlyList<int> Chains,
    WheelOrder? WheelOrder,
    DrumPosition DrumLetters,
    Letter TestRegister,
    IReadOnlyList<Letter> LiveWires)
{
    /// <summary>The indicator drum reading: the upper drums' letters reversed.</summary>
    public DrumPosition Indicator => DrumLetters.Indicator;

    /// <summary>The stecker partner of the test register letter the live wires give, or null.</summary>
    public Letter? Stecker => BombeStop.PartnerOf(LiveWires);
}
