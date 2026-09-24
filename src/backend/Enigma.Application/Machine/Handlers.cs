using Enigma.Domain.Machine;

namespace Enigma.Application.Machine;

public sealed class CreateMachineHandler(IMachineSessionStore store)
{
    public MachineState Handle(CreateMachine command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var machine = EnigmaMachine.Create(Input.Model(command.Model));
        var state = MachineState.From(machine, null);
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

/// <summary>Steps the rotors and lights a lamp. The returned state holds the lit lamp and the new positions.</summary>
public sealed class PressKeyHandler(IMachineSessionStore store)
{
    public MachineState Handle(PressKey command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var key = Input.Letter(command.Key);
        return store.Update(m => m.PressKey(key));
    }
}

public sealed class ReleaseKeyHandler(IMachineSessionStore store)
{
    public MachineState Handle(ReleaseKey command) => store.Update(m => m.ReleaseKey());
}

public sealed class GetMachineStateHandler(IMachineSessionStore store)
{
    public MachineState Handle(GetMachineState query) => store.Use(machine => MachineState.From(machine, store.AppliedKey));
}

internal static class MachineSessionStoreExtensions
{
    /// <summary>Applies <paramref name="action"/> to the current machine and returns its new state.</summary>
    public static MachineState Update(this IMachineSessionStore store, Action<EnigmaMachine> action) =>
        store.Use(machine =>
        {
            action(machine);
            machine.ClearDomainEvents();
            return MachineState.From(machine, store.AppliedKey);
        });
}
