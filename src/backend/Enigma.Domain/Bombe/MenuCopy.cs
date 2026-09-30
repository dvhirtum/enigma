using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// A copy of the menu plugged up on the Bombe's chains: the rotor fitted in each row of its scramblers (upper, middle,
/// lower; null when empty) and each scrambler's start letters, one scrambler per menu link. The start letters are
/// those of the link's offset (ZZA, ZZB, ...) until turned by hand.
/// </summary>
public sealed class MenuCopy
{
    private readonly RotorType?[] _drums = new RotorType?[3];
    private readonly DrumPosition[] _starts;

    public MenuCopy(Menu menu)
    {
        ArgumentNullException.ThrowIfNull(menu);

        _starts = [.. menu.Links.Select(link => DrumPosition.FromOffset(link.Offset))];
    }

    /// <summary>The rotor in each row, upper to lower; null where no drums are fitted.</summary>
    public IReadOnlyList<RotorType?> Drums => _drums;

    /// <summary>The start letters of each scrambler, in the order of the menu links.</summary>
    public IReadOnlyList<DrumPosition> Starts => _starts;

    /// <summary>The wheel order of the fitted drums, or null until all three rows have drums.</summary>
    public WheelOrder? WheelOrder =>
        _drums is [{ } left, { } middle, { } right] ? new WheelOrder(left, middle, right) : null;

    public bool IsEmpty => _drums.All(rotor => rotor is null);

    /// <summary>Fits drums of <paramref name="rotor"/> in a row (0 = upper), or takes them out when null.</summary>
    public void Fit(int row, RotorType? rotor)
    {
        CheckRow(row);
        if (rotor is { IsGreek: true })
        {
            throw new DomainException("The Bombe takes rotors I–VIII only.");
        }

        if (rotor is not null && Enumerable.Range(0, 3).Any(other => other != row && _drums[other] == rotor))
        {
            throw new DomainException($"Drums of rotor {rotor} are already in another row.");
        }

        _drums[row] = rotor;
    }

    /// <summary>Sets the start letters of the <paramref name="scrambler"/>th scrambler (0 = the first menu link).</summary>
    public void Turn(int scrambler, DrumPosition start)
    {
        if (scrambler < 0 || scrambler >= _starts.Length)
        {
            throw new DomainException($"The copy has no scrambler {scrambler + 1}.");
        }

        _starts[scrambler] = start;
    }

    /// <summary>Takes the drums of <paramref name="other"/>, keeping this copy's start letters.</summary>
    internal void FitLike(MenuCopy other) => Array.Copy(other._drums, _drums, _drums.Length);

    private static void CheckRow(int row)
    {
        if (row is < 0 or > 2)
        {
            throw new DomainException($"There is no row {row + 1}; a scrambler has three drums.");
        }
    }
}
