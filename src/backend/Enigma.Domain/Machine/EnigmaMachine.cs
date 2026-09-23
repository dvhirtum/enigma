namespace Enigma.Domain.Machine;

/// <summary>A Kriegsmarine Enigma M3 or M4 with its rotor box. Aggregate root of the machine domain.</summary>
public sealed class EnigmaMachine
{
    private readonly List<IDomainEvent> _domainEvents = [];
    private readonly Rotor[] _allRotors;
    private Rotor[] _rotors = [];

    private EnigmaMachine(MachineModel model, Reflector reflector)
    {
        Model = model;
        Reflector = reflector;
        _allRotors = [.. RotorType.All
            .Where(t => model.HasGreekSlot || !t.IsGreek)
            .Select(t => new Rotor(t, RingSetting.A, RotorPosition.A))];
    }

    public MachineModel Model { get; }

    /// <summary>The inserted rotors from left to right; on the M4 the Greek rotor comes first. Empty when removed.</summary>
    public IReadOnlyList<Rotor> Rotors => _rotors;

    /// <summary>The rotors in the box, outside the machine.</summary>
    public IReadOnlyList<Rotor> RotorBox => [.. _allRotors.Except(_rotors)];

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
        machine.InsertRotors(model.HasGreekSlot
            ? [RotorType.Beta, RotorType.I, RotorType.II, RotorType.III]
            : [RotorType.I, RotorType.II, RotorType.III]);

        return machine;
    }

    public Rotor GetRotor(RotorSlot slot)
    {
        var index = Model.IndexOf(slot);
        if (index < 0)
        {
            throw new DomainException($"The {Model} has no {slot} slot.");
        }

        return _rotors.Length > 0 ? _rotors[index] : throw new DomainException("No rotors are inserted.");
    }

    /// <summary>
    /// Inserts rotors from the box, listed from left to right. Rotors already inserted go back to the box.
    /// Each rotor keeps its own ring setting and position.
    /// </summary>
    public void InsertRotors(IReadOnlyList<RotorType> types)
    {
        ArgumentNullException.ThrowIfNull(types);

        if (types.Count != Model.Slots.Count)
        {
            throw new DomainException($"The {Model} takes {Model.Slots.Count} rotors, got {types.Count}.");
        }

        if (types.Distinct().Count() != types.Count)
        {
            throw new DomainException("Each rotor can be used only once.");
        }

        for (var i = 0; i < types.Count; i++)
        {
            var greekSlot = Model.Slots[i] == RotorSlot.Greek;
            if (types[i].IsGreek != greekSlot)
            {
                throw new DomainException(greekSlot
                    ? $"The Greek slot takes Beta or Gamma, got {types[i]}."
                    : $"Rotor {types[i]} fits only the Greek slot of the M4.");
            }
        }

        _rotors = [.. types.Select(FindRotor)];
    }

    /// <summary>Lifts all rotors out of the machine into the box.</summary>
    public void RemoveRotors() => _rotors = [];

    public void SetReflector(ReflectorType type)
    {
        ArgumentNullException.ThrowIfNull(type);

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
        var rotor = FindRotor(type);
        if (_rotors.Contains(rotor))
        {
            throw new DomainException($"Remove rotor {type} from the machine before setting its ring.");
        }

        rotor.RingSetting = ringSetting;
    }

    /// <summary>Turns the thumbwheel of <paramref name="slot"/> until the window shows <paramref name="position"/>.</summary>
    public void TurnRotor(RotorSlot slot, RotorPosition position) => GetRotor(slot).Position = position;

    public void ConnectPlug(PlugPair pair) => Plugboard.Connect(pair);

    public void DisconnectPlug(Letter letter) => Plugboard.Disconnect(letter);

    /// <summary>Steps the rotors, then encrypts <paramref name="key"/> and returns the lit lamp.</summary>
    public Letter PressKey(Letter key)
    {
        if (HeldKey is { } held)
        {
            throw new DomainException($"Key {held} is still held down.");
        }

        if (_rotors.Length == 0)
        {
            throw new DomainException("No rotors are inserted.");
        }

        StepRotors();
        _domainEvents.Add(new RotorsStepped([.. _rotors.Select(r => r.Position)]));

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

        for (var i = _rotors.Length - 1; i >= 0; i--)
        {
            signal = _rotors[i].Forward(signal);
        }

        signal = Reflector.Reflect(signal);

        foreach (var rotor in _rotors)
        {
            signal = rotor.Backward(signal);
        }

        return Plugboard.Swap(signal);
    }
}
