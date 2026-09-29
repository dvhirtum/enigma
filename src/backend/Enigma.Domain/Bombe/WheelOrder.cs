using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>The rotors of a three-rotor Enigma from left to right, as fitted to the upper, middle and lower drums.</summary>
public sealed record WheelOrder
{
    private static readonly RotorType[] Rotors =
        [RotorType.I, RotorType.II, RotorType.III, RotorType.IV, RotorType.V, RotorType.VI, RotorType.VII, RotorType.VIII];

    public WheelOrder(RotorType left, RotorType middle, RotorType right)
    {
        if (left.IsGreek || middle.IsGreek || right.IsGreek)
        {
            throw new DomainException("The Bombe takes rotors I–VIII only.");
        }

        if (left == middle || middle == right || left == right)
        {
            throw new DomainException("A wheel order uses each rotor at most once.");
        }

        Left = left;
        Middle = middle;
        Right = right;
    }

    /// <summary>All 336 wheel orders of rotors I–VIII.</summary>
    public static IReadOnlyList<WheelOrder> All { get; } =
        [.. from left in Rotors
            from middle in Rotors
            from right in Rotors
            where left != middle && middle != right && left != right
            select new WheelOrder(left, middle, right)];

    public RotorType Left { get; }

    public RotorType Middle { get; }

    public RotorType Right { get; }

    /// <summary>Parses rotor names from left to right, e.g. "II V III".</summary>
    public static WheelOrder Parse(string rotors)
    {
        ArgumentNullException.ThrowIfNull(rotors);

        var names = rotors.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return names.Length == 3
            ? new WheelOrder(RotorType.FromName(names[0]), RotorType.FromName(names[1]), RotorType.FromName(names[2]))
            : throw new DomainException($"'{rotors}' is not a wheel order of three rotors.");
    }

    public override string ToString() => $"{Left} {Middle} {Right}";
}
