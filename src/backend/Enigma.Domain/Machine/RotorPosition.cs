namespace Enigma.Domain.Machine;

/// <summary>The letter shown in a rotor window.</summary>
public readonly record struct RotorPosition(Letter Letter)
{
    public static RotorPosition A { get; } = new(Letter.A);

    public static RotorPosition FromChar(char value)
    {
        return new RotorPosition(Letter.FromChar(value));
    }

    public RotorPosition Next()
    {
        return new RotorPosition(Letter.Shift(1));
    }

    public override string ToString()
    {
        return Letter.ToString();
    }
}
