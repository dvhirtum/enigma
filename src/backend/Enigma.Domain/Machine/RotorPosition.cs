namespace Enigma.Domain.Machine;

/// <summary>The letter shown in a rotor window.</summary>
public readonly record struct RotorPosition(Letter Letter)
{
    public static RotorPosition A { get; } = new(Letter.A);

    public static RotorPosition FromChar(char value) => new(Letter.FromChar(value));

    public RotorPosition Next() => new(Letter.Shift(1));

    public override string ToString() => Letter.ToString();
}
