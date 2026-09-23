namespace Enigma.Domain.Machine;

/// <summary>A Kriegsmarine Enigma model.</summary>
public sealed class MachineModel
{
    private readonly RotorSlot[] _slots;

    private MachineModel(string name, RotorSlot[] slots)
    {
        Name = name;
        _slots = slots;
    }

    /// <summary>Three rotors and reflector B or C.</summary>
    public static MachineModel M3 { get; } = new("M3", [RotorSlot.Left, RotorSlot.Middle, RotorSlot.Right]);

    /// <summary>A Greek rotor plus three rotors, and a thin reflector.</summary>
    public static MachineModel M4 { get; } =
        new("M4", [RotorSlot.Greek, RotorSlot.Left, RotorSlot.Middle, RotorSlot.Right]);

    public static IReadOnlyList<MachineModel> All { get; } = [M3, M4];

    public string Name { get; }

    /// <summary>The rotor slots from left to right.</summary>
    public IReadOnlyList<RotorSlot> Slots => _slots;

    public bool HasGreekSlot => _slots.Contains(RotorSlot.Greek);

    /// <summary>Position of <paramref name="slot"/> from the left, or -1 if the model lacks it.</summary>
    public int IndexOf(RotorSlot slot) => Array.IndexOf(_slots, slot);

    public static MachineModel FromName(string name) =>
        All.FirstOrDefault(m => m.Name == name) ?? throw new DomainException($"Unknown machine model '{name}'.");

    public override string ToString() => Name;
}
