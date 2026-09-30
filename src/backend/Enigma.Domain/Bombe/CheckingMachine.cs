using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// The Hut 8 checking machine: a reflector and three drums with Bombe drum letters and a ring each, without plugboard or
/// stepping; the drums turn only by their thumbwheels. The drum letters are the window letters less the rings. It can
/// be set up for a Bombe stop, which it remembers until its drums or reflector are changed.
/// </summary>
public sealed class CheckingMachine
{
    private readonly RotorType?[] _drums = new RotorType?[3];

    public ReflectorType Reflector { get; private set; } = ReflectorType.B;

    /// <summary>The rotor of each drum, left to right; null where none is fitted.</summary>
    public IReadOnlyList<RotorType?> Drums => _drums;

    /// <summary>The wheel order of the drums, or null until all three are fitted.</summary>
    public WheelOrder? WheelOrder => _drums is [{ } left, { } middle, { } right] ? new WheelOrder(left, middle, right) : null;

    /// <summary>The ring letters, left to right.</summary>
    public DrumPosition Rings { get; set; } = DrumPosition.ZZZ;

    /// <summary>The letters in the windows, left to right.</summary>
    public DrumPosition Windows { get; set; } = DrumPosition.ZZZ;

    /// <summary>The drum letters: each window letter less its ring letter.</summary>
    public DrumPosition DrumLetters => new(
        Windows.Left.Shift(-Rings.Left.Index),
        Windows.Middle.Shift(-Rings.Middle.Index),
        Windows.Right.Shift(-Rings.Right.Index));

    /// <summary>The stop it was set up for, until its drums or reflector are changed.</summary>
    public int? Stop { get; private set; }

    public void SetReflector(ReflectorType reflector)
    {
        ArgumentNullException.ThrowIfNull(reflector);

        if (reflector.IsThin)
        {
            throw new DomainException("The checking machine takes reflector B or C.");
        }

        Reflector = reflector;
        Stop = null;
    }

    /// <summary>Fits the drums, left to right (null: empty). A rotor fits one drum only.</summary>
    public void Fit(IReadOnlyList<RotorType?> drums)
    {
        ArgumentNullException.ThrowIfNull(drums);

        if (drums.Count != 3)
        {
            throw new DomainException("The checking machine has three drums.");
        }

        if (drums.Any(rotor => rotor is { IsGreek: true }))
        {
            throw new DomainException("The checking machine takes rotors I–VIII only.");
        }

        if (drums.OfType<RotorType>().GroupBy(rotor => rotor).FirstOrDefault(group => group.Count() > 1) is { } twice)
        {
            throw new DomainException($"Rotor {twice.Key} fits one drum only.");
        }

        for (var drum = 0; drum < 3; drum++)
        {
            _drums[drum] = drums[drum];
        }

        Stop = null;
    }

    /// <summary>
    /// Sets the machine up for a stop: its reflector and wheel order, the rings at the stop's indicator and the windows at
    /// ZZZ, so the drums show the stop's drum letters and each menu link is at its menu position (ZZA, ZZB, ...).
    /// </summary>
    public void SetUp(int stop, BombeStop found, ReflectorType reflector)
    {
        ArgumentNullException.ThrowIfNull(found);

        SetReflector(reflector);
        Fit([found.WheelOrder.Left, found.WheelOrder.Middle, found.WheelOrder.Right]);
        (Rings, Windows, Stop) = (found.Indicator, DrumPosition.ZZZ, stop);
    }

    /// <summary>Presses <paramref name="key"/> and returns the lamp that lights.</summary>
    public Letter Press(Letter key)
    {
        var order = WheelOrder ?? throw new DomainException("Fit all three drums first.");
        return Scrambler.Encipher(order, Reflector, order.CorePositions(DrumLetters), key);
    }
}
