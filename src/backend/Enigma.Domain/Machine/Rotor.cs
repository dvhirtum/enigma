namespace Enigma.Domain.Machine;

/// <summary>A rotor in a slot, with its ring setting and window position.</summary>
public sealed class Rotor
{
    public Rotor(RotorType type, RingSetting ringSetting, RotorPosition position)
    {
        ArgumentNullException.ThrowIfNull(type);

        Type = type;
        RingSetting = ringSetting;
        Position = position;
    }

    public RotorType Type { get; }

    public RingSetting RingSetting { get; internal set; }

    public RotorPosition Position { get; internal set; }

    /// <summary>True when the next step also steps the rotor to the left.</summary>
    public bool IsAtNotch => Type.Notches.Contains(Position);

    private int Offset => Position.Letter.Index - RingSetting.Letter.Index;

    internal void Step()
    {
        Position = Position.Next();
    }

    /// <summary>Signal travelling from the entry wheel towards the reflector.</summary>
    public Letter Forward(Letter input)
    {
        return Type.Wiring.Forward(input.Shift(Offset)).Shift(-Offset);
    }

    /// <summary>Signal travelling from the reflector back towards the entry wheel.</summary>
    public Letter Backward(Letter input)
    {
        return Type.Wiring.Backward(input.Shift(Offset)).Shift(-Offset);
    }
}
