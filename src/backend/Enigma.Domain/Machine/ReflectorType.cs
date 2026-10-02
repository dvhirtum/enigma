namespace Enigma.Domain.Machine;

/// <summary>A historical reflector (Umkehrwalze).</summary>
public sealed class ReflectorType
{
    private ReflectorType(string name, string wiring, bool isThin)
    {
        Name = name;
        Wiring = Wiring.Parse(wiring);
        IsThin = isThin;
    }

    public static ReflectorType B { get; } = new("B", "YRUHQSLDPXNGOKMIEBFZCWVJAT", false);

    public static ReflectorType C { get; } = new("C", "FVPJIAOYEDRZXWGCTKUQSBNMHL", false);

    public static ReflectorType BThin { get; } = new("B-thin", "ENKQAUYWJICOPBLMDXZVFTHRGS", true);

    public static ReflectorType CThin { get; } = new("C-thin", "RDOBJNTKVEHMLFCWZAXGYIPSUQ", true);

    public static IReadOnlyList<ReflectorType> All { get; } = [B, C, BThin, CThin];

    public string Name { get; }

    public Wiring Wiring { get; }

    /// <summary>True for the thin reflectors of the M4.</summary>
    public bool IsThin { get; }

    public static ReflectorType FromName(string name)
    {
        return All.FirstOrDefault(r => r.Name == name) ?? throw new DomainException($"Unknown reflector '{name}'.");
    }

    public override string ToString()
    {
        return Name;
    }
}
