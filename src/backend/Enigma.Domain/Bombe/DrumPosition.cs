using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// The positions of the left, middle and right drums: the core positions of the Enigma rotors (window letter minus
/// ring setting), or the letters the drums show (see <see cref="WheelOrder.DrumLetters"/>). Offsets are written as the drum letters they give from ZZZ, as on Bombe menus: 1 = ZZA, 26 = ZAZ.
/// </summary>
public readonly record struct DrumPosition(Letter Left, Letter Middle, Letter Right)
{
    /// <summary>The number of drum positions: 26³.</summary>
    public const int Count = Letter.Count * Letter.Count * Letter.Count;

    public static DrumPosition ZZZ { get; } = FromOffset(0);

    /// <summary>The number of places after ZZZ, 0 to <see cref="Count"/> − 1.</summary>
    public int Offset => (Digit(Left) * Letter.Count * Letter.Count) + (Digit(Middle) * Letter.Count) + Digit(Right);

    /// <summary>The indicator drum reading of these drum letters: the indicator drums have their letters in reverse order.</summary>
    public DrumPosition Indicator => new(Reverse(Left), Reverse(Middle), Reverse(Right));

    public static DrumPosition Parse(string letters)
    {
        ArgumentNullException.ThrowIfNull(letters);

        return letters.Length == 3
            ? new DrumPosition(Letter.FromChar(letters[0]), Letter.FromChar(letters[1]), Letter.FromChar(letters[2]))
            : throw new DomainException($"'{letters}' is not a drum position of three letters.");
    }

    /// <summary>The position <paramref name="offset"/> places after ZZZ, wrapping around.</summary>
    public static DrumPosition FromOffset(int offset)
    {
        var value = ((offset % Count) + Count) % Count;
        return new DrumPosition(
            FromDigit(value / (Letter.Count * Letter.Count)), FromDigit(value / Letter.Count), FromDigit(value));
    }

    /// <summary>
    /// Turns each drum on by its letter of the offset <paramref name="offset"/> places after ZZZ, without carrying from
    /// one drum to the next: the drums of all scramblers turn together, so each scrambler keeps its offset.
    /// </summary>
    public DrumPosition Advance(int offset)
    {
        var steps = FromOffset(offset);
        return new DrumPosition(
            Left.Shift(Digit(steps.Left)), Middle.Shift(Digit(steps.Middle)), Right.Shift(Digit(steps.Right)));
    }

    public override string ToString() => $"{Left}{Middle}{Right}";

    // Z counts as 0 on the drums, A as 1.
    private static int Digit(Letter letter) => (letter.Index + 1) % Letter.Count;

    private static Letter FromDigit(int digit) => Letter.A.Shift((digit % Letter.Count) - 1);

    private static Letter Reverse(Letter letter) => Letter.FromIndex(Letter.Count - 1 - letter.Index);
}
