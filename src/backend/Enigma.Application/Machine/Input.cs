using Enigma.Domain.Machine;

namespace Enigma.Application.Machine;

/// <summary>Parses command input into domain values. Bad input throws <see cref="DomainException"/>.</summary>
internal static class Input
{
    public static Letter Letter(string? value) =>
        value is { Length: 1 }
            ? Domain.Machine.Letter.FromChar(value[0])
            : throw new DomainException($"'{value}' is not a letter A–Z.");

    public static RotorSlot Slot(string? value)
    {
        foreach (var slot in Enum.GetValues<RotorSlot>())
        {
            if (string.Equals(slot.ToString(), value, StringComparison.OrdinalIgnoreCase))
            {
                return slot;
            }
        }

        throw new DomainException($"Unknown rotor slot '{value}'.");
    }

    public static MachineModel Model(string? value) => MachineModel.FromName(value ?? string.Empty);

    public static RotorType Rotor(string? value) => RotorType.FromName(value ?? string.Empty);

    public static ReflectorType Reflector(string? value) => ReflectorType.FromName(value ?? string.Empty);

    public static PlugPair PlugPair(string? value) => Domain.Machine.PlugPair.Parse(value ?? string.Empty);
}
