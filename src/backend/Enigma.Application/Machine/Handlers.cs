using Enigma.Domain.Machine;

namespace Enigma.Application.Machine;

public sealed class CreateMachineHandler(IMachineSessionStore store)
{
    public MachineState Handle(CreateMachine command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var machine = EnigmaMachine.Create(Input.Model(command.Model));
        var state = MachineState.From(machine, null, null, store.Lamps);
        store.Replace(machine);
        return state;
    }
}

public sealed class InsertRotorHandler(IMachineSessionStore store)
{
    public MachineState Handle(InsertRotor command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var slot = Input.Slot(command.Slot);
        var rotor = Input.Rotor(command.Rotor);
        return store.Update(m => m.InsertRotor(slot, rotor));
    }
}

public sealed class RemoveRotorHandler(IMachineSessionStore store)
{
    public MachineState Handle(RemoveRotor command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var slot = Input.Slot(command.Slot);
        return store.Update(m => m.RemoveRotor(slot));
    }
}

public sealed class SetRingSettingHandler(IMachineSessionStore store)
{
    public MachineState Handle(SetRingSetting command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var rotor = Input.Rotor(command.Rotor);
        var ringSetting = RingSetting.FromNumber(command.RingSetting);
        return store.Update(m => m.SetRingSetting(rotor, ringSetting));
    }
}

public sealed class SetReflectorHandler(IMachineSessionStore store)
{
    public MachineState Handle(SetReflector command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var reflector = Input.Reflector(command.Reflector);
        return store.Update(m => m.SetReflector(reflector));
    }
}

public sealed class ConnectPlugHandler(IMachineSessionStore store)
{
    public MachineState Handle(ConnectPlug command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var pair = Input.PlugPair(command.Pair);
        return store.Update(m => m.ConnectPlug(pair));
    }
}

public sealed class DisconnectPlugHandler(IMachineSessionStore store)
{
    public MachineState Handle(DisconnectPlug command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var letter = Input.Letter(command.Letter);
        return store.Update(m => m.DisconnectPlug(letter));
    }
}

public sealed class MovePlugHandler(IMachineSessionStore store)
{
    public MachineState Handle(MovePlug command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var from = Input.Letter(command.From);
        var to = Input.Letter(command.To);
        return store.Update(m => m.MovePlug(from, to));
    }
}

public sealed class TurnRotorHandler(IMachineSessionStore store)
{
    public MachineState Handle(TurnRotor command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var slot = Input.Slot(command.Slot);
        var position = new RotorPosition(Input.Letter(command.Position));
        return store.Update(m => m.TurnRotor(slot, position));
    }
}

/// <summary>
///     Steps the rotors and lights a lamp. The returned state holds the lit lamp and the new positions. A running operator
///     procedure rejects keys it does not expect and records the lamp.
/// </summary>
public sealed class PressKeyHandler(IMachineSessionStore store)
{
    public MachineState Handle(PressKey command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var key = Input.Letter(command.Key);
        return store.Use(machine =>
        {
            var procedure = store.Procedure;
            procedure?.CheckKey(key);
            var lamp = machine.PressKey(key);
            machine.ClearDomainEvents();
            procedure?.Record(machine, key, lamp);
            store.Lamps += lamp.ToString();
            return MachineState.From(machine, store.AppliedKey, procedure, store.Lamps);
        });
    }
}

public sealed class ReleaseKeyHandler(IMachineSessionStore store)
{
    public MachineState Handle(ReleaseKey command)
    {
        return store.Update(m => m.ReleaseKey());
    }
}

public sealed class ClearLampsHandler(IMachineSessionStore store)
{
    public MachineState Handle(ClearLamps command)
    {
        return store.Use(machine =>
        {
            store.Lamps = string.Empty;
            return MachineState.From(machine, store.AppliedKey, store.Procedure, store.Lamps);
        });
    }
}

public sealed class GetMachineStateHandler(IMachineSessionStore store)
{
    public MachineState Handle(GetMachineState query)
    {
        return store.Use(machine => MachineState.From(machine, store.AppliedKey, store.Procedure, store.Lamps));
    }
}

internal static class MachineSessionStoreExtensions
{
    /// <summary>
    ///     Applies <paramref name="action" /> to the current machine, lets the operator procedure follow the change, and
    ///     returns the new state.
    /// </summary>
    public static MachineState Update(this IMachineSessionStore store, Action<EnigmaMachine> action)
    {
        return store.Use(machine =>
        {
            action(machine);
            machine.ClearDomainEvents();
            store.Procedure?.Observe(machine);
            return MachineState.From(machine, store.AppliedKey, store.Procedure, store.Lamps);
        });
    }
}

public sealed class SetUpMachineHandler(IMachineSessionStore store)
{
    public MachineState Handle(SetUpMachine command)
    {
        ArgumentNullException.ThrowIfNull(command);
        ArgumentNullException.ThrowIfNull(command.Rotors);
        ArgumentNullException.ThrowIfNull(command.Rings);
        ArgumentNullException.ThrowIfNull(command.Plugs);

        var model = command.Rotors.Count switch
        {
            3 => MachineModel.M3,
            4 => MachineModel.M4,
            _ => throw new DomainException($"A machine has 3 rotors (M3) or 4 (M4), got {command.Rotors.Count}.")
        };
        if (command.Rings.Count != command.Rotors.Count || command.Positions?.Length != command.Rotors.Count)
            throw new DomainException(
                $"{command.Rotors.Count} rotors need {command.Rotors.Count} rings and window letters.");

        var machine = EnigmaMachine.Create(model);
        machine.SetReflector(Input.Reflector(command.Reflector));
        foreach (var slot in model.Slots) machine.RemoveRotor(slot);

        foreach (var (slot, index) in model.Slots.Select((slot, index) => (slot, index)))
        {
            var rotor = Input.Rotor(command.Rotors[index]);
            machine.SetRingSetting(rotor, RingSetting.FromNumber(command.Rings[index]));
            machine.InsertRotor(slot, rotor);
            machine.TurnRotor(slot, RotorPosition.FromChar(char.ToUpperInvariant(command.Positions[index])));
        }

        foreach (var pair in command.Plugs) machine.ConnectPlug(Input.PlugPair(pair));

        var state = MachineState.From(machine, null, null, store.Lamps);
        store.Replace(machine);
        return state;
    }
}
