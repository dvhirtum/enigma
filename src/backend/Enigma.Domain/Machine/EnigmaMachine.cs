namespace Enigma.Domain.Machine;

/// <summary>A Kriegsmarine Enigma M3 or M4 with its rotor box. Aggregate root of the machine domain.</summary>
public sealed class EnigmaMachine
{
    private readonly List<IDomainEvent> _domainEvents = [];
    private readonly Rotor[] _allRotors;
    private readonly Rotor?[] _slots;

    private EnigmaMachine(MachineModel model, Reflector reflector)
    {
        Model = model;
        Reflector = reflector;
        _allRotors = [.. RotorType.All
            .Where(t => model.HasGreekSlot || !t.IsGreek)
            .Select(t => new Rotor(t, RingSetting.A, RotorPosition.A))];
        _slots = new Rotor?[model.Slots.Count];
    }

    public MachineModel Model { get; }

    /// <summary>The inserted rotors from left to right, skipping empty slots; on the M4 the Greek rotor comes first.</summary>
    public IReadOnlyList<Rotor> Rotors => [.. _slots.OfType<Rotor>()];

    /// <summary>The rotors in the box, outside the machine.</summary>
    public IReadOnlyList<Rotor> RotorBox => [.. _allRotors.Except(Rotors)];

    /// <summary>True when every slot holds a rotor.</summary>
    public bool IsComplete => Array.TrueForAll(_slots, r => r is not null);

    public Reflector Reflector { get; private set; }

    public Plugboard Plugboard { get; } = new();

    /// <summary>The key held down, if any.</summary>
    public Letter? HeldKey { get; private set; }

    /// <summary>The lamp lit while a key is held down, if any.</summary>
    public Letter? LitLamp { get; private set; }

    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents;

    /// <summary>
    /// Creates a machine with rotors I-II-III (Beta-I-II-III on the M4), reflector B (B-thin on the M4),
    /// all rings and positions at A, and no plugs.
    /// </summary>
    public static EnigmaMachine Create(MachineModel model)
    {
        ArgumentNullException.ThrowIfNull(model);

        var machine = new EnigmaMachine(model, new Reflector(model.HasGreekSlot ? ReflectorType.BThin : ReflectorType.B));
        RotorType[] rotors = model.HasGreekSlot
            ? [RotorType.Beta, RotorType.I, RotorType.II, RotorType.III]
            : [RotorType.I, RotorType.II, RotorType.III];
        foreach (var (slot, type) in model.Slots.Zip(rotors))
        {
            machine.InsertRotor(slot, type);
        }

        return machine;
    }

    /// <summary>The rotor in <paramref name="slot"/>, or null when the slot is empty.</summary>
    public Rotor? RotorIn(RotorSlot slot) => _slots[SlotIndex(slot)];

    public Rotor GetRotor(RotorSlot slot) =>
        RotorIn(slot) ?? throw new DomainException($"The {slot} slot is empty.");

    /// <summary>
    /// Puts a rotor from the box into <paramref name="slot"/>. A rotor already in that slot goes back to the box.
    /// Each rotor keeps its own ring setting and position.
    /// </summary>
    public void InsertRotor(RotorSlot slot, RotorType type)
    {
        ArgumentNullException.ThrowIfNull(type);
        EnsureNoKeyHeld();

        var index = SlotIndex(slot);
        var rotor = FindRotor(type);
        var current = Array.IndexOf(_slots, rotor);
        if (current >= 0)
        {
            throw new DomainException($"Rotor {type} is already in the {Model.Slots[current]} slot.");
        }

        if (type.IsGreek != (slot == RotorSlot.Greek))
        {
            throw new DomainException(slot == RotorSlot.Greek
                ? $"The Greek slot takes Beta or Gamma, got {type}."
                : $"Rotor {type} fits only the Greek slot of the M4.");
        }

        _slots[index] = rotor;
    }

    /// <summary>Lifts the rotor in <paramref name="slot"/> out of the machine into the box.</summary>
    public void RemoveRotor(RotorSlot slot)
    {
        EnsureNoKeyHeld();

        var index = SlotIndex(slot);
        if (_slots[index] is null)
        {
            throw new DomainException($"The {slot} slot is empty.");
        }

        _slots[index] = null;
    }

    public void SetReflector(ReflectorType type)
    {
        ArgumentNullException.ThrowIfNull(type);
        EnsureNoKeyHeld();

        if (type.IsThin != Model.HasGreekSlot)
        {
            throw new DomainException(Model.HasGreekSlot
                ? $"The M4 takes a thin reflector, got {type}."
                : $"The M3 takes reflector B or C, got {type}.");
        }

        Reflector = new Reflector(type);
    }

    /// <summary>Sets the ring of a rotor in the box. Inserted rotors must be removed first.</summary>
    public void SetRingSetting(RotorType type, RingSetting ringSetting)
    {
        EnsureNoKeyHeld();

        var rotor = FindRotor(type);
        if (_slots.Contains(rotor))
        {
            throw new DomainException($"Remove rotor {type} from the machine before setting its ring.");
        }

        rotor.RingSetting = ringSetting;
    }

    /// <summary>Turns the thumbwheel of <paramref name="slot"/> until the window shows <paramref name="position"/>.</summary>
    public void TurnRotor(RotorSlot slot, RotorPosition position)
    {
        EnsureNoKeyHeld();
        GetRotor(slot).Position = position;
    }

    public void ConnectPlug(PlugPair pair)
    {
        EnsureNoKeyHeld();
        Plugboard.Connect(pair);
    }

    public void DisconnectPlug(Letter letter)
    {
        EnsureNoKeyHeld();
        Plugboard.Disconnect(letter);
    }

    public void MovePlug(Letter from, Letter to)
    {
        EnsureNoKeyHeld();
        Plugboard.Move(from, to);
    }

    /// <summary>Steps the rotors, then encrypts <paramref name="key"/> and returns the lit lamp.</summary>
    public Letter PressKey(Letter key)
    {
        EnsureNoKeyHeld();

        if (!IsComplete)
        {
            throw new DomainException("Every rotor slot needs a rotor.");
        }

        StepRotors();
        _domainEvents.Add(new RotorsStepped([.. Rotors.Select(r => r.Position)]));

        var lamp = Encrypt(key);
        HeldKey = key;
        LitLamp = lamp;
        _domainEvents.Add(new LampLit(lamp));

        return lamp;
    }

    public void ReleaseKey()
    {
        if (HeldKey is null)
        {
            throw new DomainException("No key is held down.");
        }

        HeldKey = null;
        LitLamp = null;
    }

    public void ClearDomainEvents() => _domainEvents.Clear();

    /// <summary>While a key is held down, only <see cref="ReleaseKey"/> is allowed.</summary>
    private void EnsureNoKeyHeld()
    {
        if (HeldKey is { } held)
        {
            throw new DomainException($"Key {held} is still held down.");
        }
    }

    private int SlotIndex(RotorSlot slot)
    {
        var index = Model.IndexOf(slot);
        return index >= 0 ? index : throw new DomainException($"The {Model} has no {slot} slot.");
    }

    private Rotor FindRotor(RotorType type) =>
        Array.Find(_allRotors, r => r.Type == type) ?? throw new DomainException($"The {Model} has no rotor {type}.");

    private void StepRotors()
    {
        var left = GetRotor(RotorSlot.Left);
        var middle = GetRotor(RotorSlot.Middle);
        var right = GetRotor(RotorSlot.Right);

        // The middle rotor steps with the left one when at its notch (double step).
        var stepLeft = middle.IsAtNotch;
        var stepMiddle = middle.IsAtNotch || right.IsAtNotch;

        right.Step();
        if (stepMiddle)
        {
            middle.Step();
        }

        if (stepLeft)
        {
            left.Step();
        }
    }

    private Letter Encrypt(Letter key)
    {
        var signal = Plugboard.Swap(key);
        var rotors = Rotors;

        for (var i = rotors.Count - 1; i >= 0; i--)
        {
            signal = rotors[i].Forward(signal);
        }

        signal = Reflector.Reflect(signal);

        foreach (var rotor in rotors)
        {
            signal = rotor.Backward(signal);
        }

        return Plugboard.Swap(signal);
    }
}
