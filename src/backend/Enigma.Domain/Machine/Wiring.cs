namespace Enigma.Domain.Machine;

/// <summary>A permutation of the alphabet, written as the images of A–Z.</summary>
public sealed class Wiring : IEquatable<Wiring>
{
    private readonly Letter[] _backward = new Letter[Letter.Count];
    private readonly Letter[] _forward = new Letter[Letter.Count];

    private Wiring(string mapping)
    {
        Mapping = mapping;
        for (var i = 0; i < Letter.Count; i++)
        {
            var image = Letter.FromChar(mapping[i]);
            _forward[i] = image;
            _backward[image.Index] = Letter.FromIndex(i);
        }
    }

    public string Mapping { get; }

    /// <summary>True when the wiring swaps letters in pairs and maps no letter to itself.</summary>
    public bool IsReflection =>
        Enumerable.Range(0, Letter.Count).All(i => _forward[i].Index != i && _forward[_forward[i].Index].Index == i);

    public bool Equals(Wiring? other)
    {
        return other is not null && Mapping == other.Mapping;
    }

    public static Wiring Parse(string mapping)
    {
        ArgumentNullException.ThrowIfNull(mapping);

        if (mapping.Length != Letter.Count
            || !mapping.All(char.IsAsciiLetterUpper)
            || mapping.Distinct().Count() != Letter.Count)
            throw new DomainException($"'{mapping}' is not a permutation of A–Z.");

        return new Wiring(mapping);
    }

    public Letter Forward(Letter input)
    {
        return _forward[input.Index];
    }

    public Letter Backward(Letter input)
    {
        return _backward[input.Index];
    }

    public override bool Equals(object? obj)
    {
        return Equals(obj as Wiring);
    }

    public override int GetHashCode()
    {
        return Mapping.GetHashCode(StringComparison.Ordinal);
    }

    public override string ToString()
    {
        return Mapping;
    }
}
