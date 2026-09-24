using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>
/// The key for one day of a sheet: reflector, Walzenlage (rotor order, left to right, Greek rotor first on the M4),
/// Ringstellung, Steckerverbindungen and optionally the Grundstellung.
/// </summary>
public sealed class DailyKey
{
    public DailyKey(
        int day,
        ReflectorType reflector,
        IReadOnlyList<RotorType> rotors,
        IReadOnlyList<RingSetting> rings,
        IReadOnlyList<PlugPair> plugs,
        RotorPositions? grundstellung = null)
    {
        ArgumentNullException.ThrowIfNull(reflector);
        ArgumentNullException.ThrowIfNull(rotors);
        ArgumentNullException.ThrowIfNull(rings);
        ArgumentNullException.ThrowIfNull(plugs);

        if (day is < 1 or > 31)
        {
            throw new DomainException($"Day {day} is outside 1–31.");
        }

        Model = rotors.Count switch
        {
            3 => MachineModel.M3,
            4 => MachineModel.M4,
            _ => throw new DomainException($"Day {day}: a Walzenlage has 3 rotors (M3) or 4 (M4), got {rotors.Count}."),
        };

        if (rings.Count != rotors.Count)
        {
            throw new DomainException($"Day {day}: {rotors.Count} rotors need {rotors.Count} ring settings, got {rings.Count}.");
        }

        var twice = rotors.GroupBy(r => r).FirstOrDefault(g => g.Count() > 1);
        if (twice is not null)
        {
            throw new DomainException($"Day {day}: rotor {twice.Key} appears more than once in the Walzenlage.");
        }

        if (plugs.Count > Plugboard.MaxPairs)
        {
            throw new DomainException($"Day {day}: at most {Plugboard.MaxPairs} plug pairs, got {plugs.Count}.");
        }

        if (grundstellung is not null && grundstellung.Count != rotors.Count)
        {
            throw new DomainException($"Day {day}: {rotors.Count} rotors need a Grundstellung of {rotors.Count} letters, got {grundstellung}.");
        }

        Day = day;
        Reflector = reflector;
        Rotors = [.. rotors];
        Rings = [.. rings];
        Plugs = [.. plugs];
        Grundstellung = grundstellung;

        try
        {
            SetUp();
        }
        catch (DomainException exception)
        {
            throw new DomainException($"Day {day}: {exception.Message}", exception);
        }
    }

    public int Day { get; }

    public MachineModel Model { get; }

    public ReflectorType Reflector { get; }

    /// <summary>The Walzenlage from left to right; on the M4 the Greek rotor comes first.</summary>
    public IReadOnlyList<RotorType> Rotors { get; }

    /// <summary>The ring setting of each rotor in <see cref="Rotors"/>.</summary>
    public IReadOnlyList<RingSetting> Rings { get; }

    public IReadOnlyList<PlugPair> Plugs { get; }

    /// <summary>The rotor setting for encrypting the Verfahrenkenngruppe, or null when the sheet gives none.</summary>
    public RotorPositions? Grundstellung { get; }

    /// <summary>True when <paramref name="machine"/> has this key's reflector, rotor order, rings and plugs. Positions are ignored.</summary>
    public bool IsSetUpOn(EnigmaMachine machine)
    {
        ArgumentNullException.ThrowIfNull(machine);

        return machine.Model == Model
            && machine.Reflector.Type == Reflector
            && Model.Slots.Select(machine.RotorIn).Select(r => r?.Type).SequenceEqual(Rotors)
            && machine.Rotors.Select(r => r.RingSetting).SequenceEqual(Rings)
            && machine.Plugboard.Pairs.ToHashSet().SetEquals(Plugs);
    }

    /// <summary>Creates a machine of <see cref="Model"/> set up with this key. All rotors show A.</summary>
    public EnigmaMachine SetUp()
    {
        var machine = EnigmaMachine.Create(Model);
        foreach (var slot in Model.Slots)
        {
            machine.RemoveRotor(slot);
        }

        foreach (var (slot, rotor, ring) in Model.Slots.Zip(Rotors, Rings))
        {
            machine.SetRingSetting(rotor, ring);
            machine.InsertRotor(slot, rotor);
        }

        machine.SetReflector(Reflector);
        foreach (var plug in Plugs)
        {
            machine.ConnectPlug(plug);
        }

        return machine;
    }
}
