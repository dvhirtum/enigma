using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>
/// The Grundstellung and the Spruchschlüssel: the lamps lit by typing the Verfahrenkenngruppe at the Grundstellung.
/// On the M4 the Greek rotor keeps its Grundstellung letter.
/// </summary>
public sealed record MessageKey(RotorPositions Grundstellung, Kenngruppe Verfahrenkenngruppe, RotorPositions Spruchschluessel)
{
    /// <summary>Builds the message key from the three lamps lit while typing the Verfahrenkenngruppe.</summary>
    public static MessageKey FromLamps(RotorPositions grundstellung, Kenngruppe verfahrenkenngruppe, IReadOnlyList<Letter> lamps)
    {
        ArgumentNullException.ThrowIfNull(grundstellung);
        ArgumentNullException.ThrowIfNull(lamps);

        if (lamps.Count != 3)
        {
            throw new DomainException($"A Spruchschlüssel takes 3 lamps, got {lamps.Count}.");
        }

        var greek = grundstellung.Positions.Take(grundstellung.Count - 3);
        return new MessageKey(grundstellung, verfahrenkenngruppe, new RotorPositions([.. greek, .. lamps.Select(l => new RotorPosition(l))]));
    }

    /// <summary>Encrypts the Verfahrenkenngruppe on a machine set up with <paramref name="key"/> at the Grundstellung.</summary>
    public static MessageKey Derive(DailyKey key, RotorPositions grundstellung, Kenngruppe verfahrenkenngruppe)
    {
        ArgumentNullException.ThrowIfNull(key);
        ArgumentNullException.ThrowIfNull(grundstellung);

        var machine = key.SetUp();
        foreach (var (slot, position) in key.Model.Slots.Zip(grundstellung.Positions))
        {
            machine.TurnRotor(slot, position);
        }

        var lamps = verfahrenkenngruppe.Letters.Select(letter =>
        {
            var lamp = machine.PressKey(letter);
            machine.ReleaseKey();
            return lamp;
        }).ToList();
        return FromLamps(grundstellung, verfahrenkenngruppe, lamps);
    }
}
