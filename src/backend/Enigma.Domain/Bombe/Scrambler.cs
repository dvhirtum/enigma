using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// A double-ended Enigma: three drums and a reflector, without plugboard. At a drum position it connects each letter
/// to the letter the Enigma rotors would encipher it to at those core positions. The connection works both ways.
/// </summary>
public sealed class Scrambler
{
    private readonly byte[] _table;

    public Scrambler(WheelOrder wheelOrder, ReflectorType reflector)
    {
        ArgumentNullException.ThrowIfNull(wheelOrder);
        ArgumentNullException.ThrowIfNull(reflector);

        if (reflector.IsThin)
        {
            throw new DomainException("The three-rotor Bombe takes reflector B or C.");
        }

        WheelOrder = wheelOrder;
        Reflector = reflector;
        _table = BuildTable(wheelOrder, reflector);
    }

    public WheelOrder WheelOrder { get; }

    public ReflectorType Reflector { get; }

    public Letter Encipher(Letter input, DrumPosition position) =>
        Letter.FromIndex(_table[(position.Offset * Letter.Count) + input.Index]);

    /// <summary>The 26 outputs at a drum position, by input letter index.</summary>
    internal ReadOnlySpan<byte> At(int offset) => _table.AsSpan(offset * Letter.Count, Letter.Count);

    private static byte[] BuildTable(WheelOrder wheelOrder, ReflectorType reflector)
    {
        Wiring[] wirings = [wheelOrder.Left.Wiring, wheelOrder.Middle.Wiring, wheelOrder.Right.Wiring];
        var table = new byte[DrumPosition.Count * Letter.Count];
        for (var offset = 0; offset < DrumPosition.Count; offset++)
        {
            var position = DrumPosition.FromOffset(offset);
            int[] cores = [position.Left.Index, position.Middle.Index, position.Right.Index];
            for (var input = 0; input < Letter.Count; input++)
            {
                var letter = Letter.FromIndex(input);
                for (var i = 2; i >= 0; i--)
                {
                    letter = wirings[i].Forward(letter.Shift(cores[i])).Shift(-cores[i]);
                }

                letter = reflector.Wiring.Forward(letter);
                for (var i = 0; i < 3; i++)
                {
                    letter = wirings[i].Backward(letter.Shift(cores[i])).Shift(-cores[i]);
                }

                table[(offset * Letter.Count) + input] = (byte)letter.Index;
            }
        }

        return table;
    }
}
