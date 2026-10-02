using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>The letters shown in the rotor windows, left to right, such as a Grundstellung or a Spruchschlüssel.</summary>
public sealed class RotorPositions : IEquatable<RotorPositions>
{
    private readonly RotorPosition[] _positions;

    public RotorPositions(IEnumerable<RotorPosition> positions)
    {
        ArgumentNullException.ThrowIfNull(positions);

        _positions = [.. positions];
        if (_positions.Length is not (3 or 4))
            throw new DomainException($"A rotor setting has 3 letters (M3) or 4 (M4), got {_positions.Length}.");
    }

    public IReadOnlyList<RotorPosition> Positions => _positions;

    public int Count => _positions.Length;

    public bool Equals(RotorPositions? other)
    {
        return other is not null && _positions.SequenceEqual(other._positions);
    }

    /// <summary>Parses letters such as "QRS".</summary>
    public static RotorPositions Parse(string value)
    {
        ArgumentNullException.ThrowIfNull(value);

        return value.All(char.IsAsciiLetter)
            ? new RotorPositions(value.Select(RotorPosition.FromChar))
            : throw new DomainException($"'{value}' is not a rotor setting such as QRS.");
    }

    /// <summary>True when the rotor windows of <paramref name="machine" /> show these letters.</summary>
    public bool IsShownOn(EnigmaMachine machine)
    {
        ArgumentNullException.ThrowIfNull(machine);

        return machine.Model.Slots.Count == Count
               && machine.Model.Slots.Select(machine.RotorIn).Select(r => r?.Position)
                   .SequenceEqual(_positions.Cast<RotorPosition?>());
    }

    /// <summary>The letters in the windows of <paramref name="machine" />, or null when a slot is empty.</summary>
    public static RotorPositions? ShownOn(EnigmaMachine machine)
    {
        ArgumentNullException.ThrowIfNull(machine);

        var rotors = machine.Model.Slots.Select(machine.RotorIn).ToList();
        return rotors.All(r => r is not null) ? new RotorPositions(rotors.Select(r => r!.Position)) : null;
    }

    public override bool Equals(object? obj)
    {
        return Equals(obj as RotorPositions);
    }

    public override int GetHashCode()
    {
        return ToString().GetHashCode(StringComparison.Ordinal);
    }

    public override string ToString()
    {
        return string.Concat(_positions.Select(p => p.ToString()));
    }
}
