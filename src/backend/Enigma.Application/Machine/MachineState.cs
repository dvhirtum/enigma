using Enigma.Application.OperatorMode;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Machine;

/// <summary>A rotor with its ring setting (1–26) and window letter. <see cref="Slot"/> is null in the rotor box.</summary>
public sealed record RotorState(string Rotor, int RingSetting, string Position, string? Slot);

/// <summary>
/// The daily key the machine was set up with. <see cref="Modified"/> is true once its setup no longer matches.
/// <see cref="Grundstellung"/> is null when the day gives none.
/// </summary>
public sealed record AppliedKeyState(string SheetId, string Network, string Month, int Day, bool Modified, string? Grundstellung);

/// <summary>
/// A snapshot of the machine. Inserted rotors are listed from left to right; empty slots are left out. <see cref="Lamps"/>
/// holds every lamp lit since the record was last cleared.
/// </summary>
public sealed record MachineState(
    string Model,
    string Reflector,
    IReadOnlyList<RotorState> Rotors,
    IReadOnlyList<RotorState> RotorBox,
    IReadOnlyList<string> Plugs,
    string? HeldKey,
    string? LitLamp,
    AppliedKeyState? AppliedKey,
    OperatorState? Operator,
    string Lamps)
{
    public static MachineState From(EnigmaMachine machine, AppliedKey? appliedKey, OperatorProcedure? procedure, string lamps)
    {
        ArgumentNullException.ThrowIfNull(machine);

        return new MachineState(
            machine.Model.Name,
            machine.Reflector.Type.Name,
            [.. machine.Model.Slots
                .Select(s => (Slot: s, Rotor: machine.RotorIn(s)))
                .Where(x => x.Rotor is not null)
                .Select(x => ToState(x.Rotor!, x.Slot.ToString()))],
            [.. machine.RotorBox.Select(r => ToState(r, null))],
            [.. machine.Plugboard.Pairs.Select(p => p.ToString())],
            machine.HeldKey?.ToString(),
            machine.LitLamp?.ToString(),
            appliedKey is null
                ? null
                : new AppliedKeyState(
                    appliedKey.SheetId, appliedKey.Network, appliedKey.Month, appliedKey.Key.Day, !appliedKey.Key.IsSetUpOn(machine),
                    appliedKey.Key.Grundstellung?.ToString()),
            procedure is null ? null : OperatorState.From(procedure),
            lamps);
    }

    private static RotorState ToState(Rotor rotor, string? slot) =>
        new(rotor.Type.Name, rotor.RingSetting.Number, rotor.Position.ToString(), slot);
}
