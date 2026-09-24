using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Machine;

internal static class MachineBuilder
{
    /// <summary>Builds a machine from key-sheet notation, e.g. rotors "II IV V", rings "02 21 12", plugs "AV BS".</summary>
    public static EnigmaMachine Build(
        MachineModel model, string reflector, string rotors, string rings, string plugs, string positions)
    {
        var machine = EnigmaMachine.Create(model);
        machine.SetReflector(ReflectorType.FromName(reflector));
        foreach (var slot in model.Slots)
        {
            machine.RemoveRotor(slot);
        }

        RotorType[] rotorTypes = [.. Split(rotors).Select(RotorType.FromName)];
        var ringNumbers = Split(rings).Select(r => int.Parse(r, System.Globalization.CultureInfo.InvariantCulture));
        foreach (var (type, ring) in rotorTypes.Zip(ringNumbers))
        {
            machine.SetRingSetting(type, RingSetting.FromNumber(ring));
        }

        foreach (var (slot, type) in model.Slots.Zip(rotorTypes))
        {
            machine.InsertRotor(slot, type);
        }

        foreach (var pair in Split(plugs))
        {
            machine.ConnectPlug(PlugPair.Parse(pair));
        }

        foreach (var (slot, position) in model.Slots.Zip(positions))
        {
            machine.TurnRotor(slot, RotorPosition.FromChar(position));
        }

        return machine;
    }

    /// <summary>Types <paramref name="text"/> key by key, ignoring spaces, and returns the lit lamps.</summary>
    public static string Type(this EnigmaMachine machine, string text)
    {
        var lamps = new System.Text.StringBuilder();
        foreach (var key in text.Where(char.IsLetter))
        {
            lamps.Append(machine.PressKey(Letter.FromChar(key)).ToChar());
            machine.ReleaseKey();
        }

        return lamps.ToString();
    }

    public static string Positions(this EnigmaMachine machine) =>
        string.Concat(machine.Rotors.Select(r => r.Position.Letter.ToChar()));

    public static string Letters(string text) => string.Concat(text.Where(char.IsLetter));

    private static string[] Split(string value) => value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
}
