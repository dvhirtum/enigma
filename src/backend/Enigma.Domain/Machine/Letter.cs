namespace Enigma.Domain.Machine;

/// <summary>One of the 26 letters A–Z.</summary>
public readonly record struct Letter
{
    public const int Count = 26;

    private Letter(int index)
    {
        Index = index;
    }

    /// <summary>Zero-based index: A = 0, Z = 25.</summary>
    public int Index { get; }

    public static Letter A { get; } = new(0);

    public static Letter FromIndex(int index)
    {
        return index is >= 0 and < Count
            ? new Letter(index)
            : throw new DomainException($"Letter index {index} is outside 0–25.");
    }

    public static Letter FromChar(char value)
    {
        var upper = char.ToUpperInvariant(value);
        return upper is >= 'A' and <= 'Z'
            ? new Letter(upper - 'A')
            : throw new DomainException($"'{value}' is not a letter A–Z.");
    }

    /// <summary>Returns the letter <paramref name="offset" /> places further, wrapping around.</summary>
    public Letter Shift(int offset)
    {
        return new Letter((((Index + offset) % Count) + Count) % Count);
    }

    public char ToChar()
    {
        return (char)('A' + Index);
    }

    public override string ToString()
    {
        return ToChar().ToString();
    }
}
