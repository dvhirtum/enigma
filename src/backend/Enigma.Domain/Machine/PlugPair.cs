namespace Enigma.Domain.Machine;

/// <summary>A plugboard cable joining two different letters. The lower letter comes first.</summary>
public readonly record struct PlugPair
{
    private PlugPair(Letter first, Letter second)
    {
        First = first;
        Second = second;
    }

    public Letter First { get; }

    public Letter Second { get; }

    public static PlugPair Create(Letter a, Letter b)
    {
        if (a == b)
        {
            throw new DomainException($"A plug pair needs two different letters, got {a}{b}.");
        }

        return a.Index < b.Index ? new PlugPair(a, b) : new PlugPair(b, a);
    }

    /// <summary>Parses a pair such as "AT".</summary>
    public static PlugPair Parse(string pair)
    {
        ArgumentNullException.ThrowIfNull(pair);

        return pair.Length == 2
            ? Create(Letter.FromChar(pair[0]), Letter.FromChar(pair[1]))
            : throw new DomainException($"'{pair}' is not a plug pair.");
    }

    public bool Contains(Letter letter) => letter == First || letter == Second;

    public Letter Other(Letter letter) =>
        letter == First ? Second
        : letter == Second ? First
        : throw new DomainException($"{letter} is not part of plug pair {this}.");

    public override string ToString() => $"{First}{Second}";
}
