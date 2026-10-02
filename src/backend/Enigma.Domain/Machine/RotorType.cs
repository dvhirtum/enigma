namespace Enigma.Domain.Machine;

/// <summary>A historical rotor (Walze) with its wiring and turnover notches.</summary>
public sealed class RotorType
{
    private RotorType(string name, string wiring, string notches, bool isGreek)
    {
        Name = name;
        Wiring = Wiring.Parse(wiring);
        Notches = [.. notches.Select(RotorPosition.FromChar)];
        IsGreek = isGreek;
    }

    public static RotorType I { get; } = new("I", "EKMFLGDQVZNTOWYHXUSPAIBRCJ", "Q", false);

    public static RotorType II { get; } = new("II", "AJDKSIRUXBLHWTMCQGZNPYFVOE", "E", false);

    public static RotorType III { get; } = new("III", "BDFHJLCPRTXVZNYEIWGAKMUSQO", "V", false);

    public static RotorType IV { get; } = new("IV", "ESOVPZJAYQUIRHXLNFTGKDCMWB", "J", false);

    public static RotorType V { get; } = new("V", "VZBRGITYUPSDNHLXAWMJQOFECK", "Z", false);

    public static RotorType VI { get; } = new("VI", "JPGVOUMFYQBENHZRDKASXLICTW", "ZM", false);

    public static RotorType VII { get; } = new("VII", "NZJHGRCXMYSWBOUFAIVLPEKQDT", "ZM", false);

    public static RotorType VIII { get; } = new("VIII", "FKQHTLXOCBJSPDZRAMEWNIUYGV", "ZM", false);

    public static RotorType Beta { get; } = new("Beta", "LEYJVCNIXWPBQMDRTAKZGFUHOS", "", true);

    public static RotorType Gamma { get; } = new("Gamma", "FSOKANUERHMBTIYCWLQPZXVGJD", "", true);

    public static IReadOnlyList<RotorType> All { get; } = [I, II, III, IV, V, VI, VII, VIII, Beta, Gamma];

    public string Name { get; }

    public Wiring Wiring { get; }

    /// <summary>Window positions at which the next key press also steps the rotor to the left.</summary>
    public IReadOnlyList<RotorPosition> Notches { get; }

    /// <summary>True for Beta and Gamma, which fit only the Greek slot of the M4.</summary>
    public bool IsGreek { get; }

    public static RotorType FromName(string name)
    {
        return All.FirstOrDefault(r => r.Name == name) ?? throw new DomainException($"Unknown rotor '{name}'.");
    }

    public override string ToString()
    {
        return Name;
    }
}
