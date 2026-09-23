using Enigma.Domain.Machine;

namespace Enigma.Application.Machine;

/// <summary>A rotor with its ring setting (1–26) and window letter. <see cref="Slot"/> is null in the rotor box.</summary>
public sealed record RotorState(string Rotor, int RingSetting, string Position, string? Slot);

/// <summary>A snapshot of the machine. Inserted rotors are listed from left to right.</summary>
public sealed record MachineState(
    string Model,
    string Reflector,
    IReadOnlyList<RotorState> Rotors,
    IReadOnlyList<RotorState> RotorBox,
    IReadOnlyList<string> Plugs,
    string? HeldKey,
    string? LitLamp)
{
    public static MachineState From(EnigmaMachine machine)
    {
        ArgumentNullException.ThrowIfNull(machine);

        return new MachineState(
            machine.Model.Name,
            machine.Reflector.Type.Name,
            [.. machine.Rotors.Select((r, i) => ToState(r, machine.Model.Slots[i].ToString()))],
            [.. machine.RotorBox.Select(r => ToState(r, null))],
            [.. machine.Plugboard.Pairs.Select(p => p.ToString())],
            machine.HeldKey?.ToString(),
            machine.LitLamp?.ToString());
    }

    private static RotorState ToState(Rotor rotor, string? slot) =>
        new(rotor.Type.Name, rotor.RingSetting.Number, rotor.Position.ToString(), slot);
}
