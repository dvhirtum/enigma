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

        if (pair.First == pair.Second)
        {
            throw new DomainException($"A plug pair needs two different letters, got {pair}.");
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

    /// <summary>Moves the cable end plugged into <paramref name="from"/> to the free socket <paramref name="to"/>.</summary>
    public void Move(Letter from, Letter to)
    {
        var index = _pairs.FindIndex(p => p.Contains(from));
        if (index < 0)
        {
            throw new DomainException($"No cable is plugged into {from}.");
        }

        var taken = _pairs.FindIndex(p => p.Contains(to));
        if (taken >= 0)
        {
            throw new DomainException($"Cannot move the plug to {to}: {_pairs[taken]} is already plugged in.");
        }

        _pairs[index] = PlugPair.Create(_pairs[index].Other(from), to);
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
