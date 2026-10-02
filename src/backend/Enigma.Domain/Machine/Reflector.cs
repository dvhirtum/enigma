namespace Enigma.Domain.Machine;

/// <summary>The reflector fitted to a machine.</summary>
public sealed class Reflector
{
    public Reflector(ReflectorType type)
    {
        ArgumentNullException.ThrowIfNull(type);

        Type = type;
    }

    public ReflectorType Type { get; }

    public Letter Reflect(Letter input)
    {
        return Type.Wiring.Forward(input);
    }
}
