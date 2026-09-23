namespace Enigma.Domain.Machine;

/// <summary>The plugboard (Steckerbrett): up to 13 cables, each letter in at most one.</summary>
public sealed class Plugboard
{
    public const int MaxPairs = 13;

    private readonly List<PlugPair> _pairs = [];

    public IReadOnlyList<PlugPair> Pairs => _pairs;

    public void Connect(PlugPair pair)
    {
        if (_pairs.Count == MaxPairs)
        {
            throw new DomainException($"The plugboard holds at most {MaxPairs} pairs.");
        }

        var taken = _pairs.FindIndex(p => p.Contains(pair.First) || p.Contains(pair.Second));
        if (taken >= 0)
        {
            throw new DomainException($"Cannot connect {pair}: {_pairs[taken]} is already plugged in.");
        }

        _pairs.Add(pair);
    }

    /// <summary>Removes the cable plugged into <paramref name="letter"/>.</summary>
    public void Disconnect(Letter letter)
    {
        var index = _pairs.FindIndex(p => p.Contains(letter));
        if (index < 0)
        {
            throw new DomainException($"No cable is plugged into {letter}.");
        }

        _pairs.RemoveAt(index);
    }

    public Letter Swap(Letter input)
    {
        foreach (var pair in _pairs)
        {
            if (pair.Contains(input))
            {
                return pair.Other(input);
            }
        }

        return input;
    }
}
