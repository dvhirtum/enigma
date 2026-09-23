namespace Enigma.Domain.Machine;

/// <summary>The Ringstellung of a rotor: 01–26, or A–Z.</summary>
public readonly record struct RingSetting(Letter Letter)
{
    public static RingSetting A { get; } = new(Letter.A);

    /// <summary>1-based number as printed on Navy key sheets: 01 = A, 26 = Z.</summary>
    public int Number => Letter.Index + 1;

    public static RingSetting FromNumber(int number) =>
        number is >= 1 and <= Letter.Count
            ? new RingSetting(Letter.FromIndex(number - 1))
            : throw new DomainException($"Ring setting {number} is outside 1–26.");

    public static RingSetting FromChar(char value) => new(Letter.FromChar(value));

    public override string ToString() => Number.ToString("00", System.Globalization.CultureInfo.InvariantCulture);
}
