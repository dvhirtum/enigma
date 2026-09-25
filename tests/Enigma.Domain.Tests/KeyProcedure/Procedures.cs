using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

internal static class Procedures
{
    public static DateTimeOffset Created { get; } = new(1944, 6, 1, 0, 0, 0, TimeSpan.Zero);

    public static Kenngruppenbuch Book(params string[] networks) =>
        Kenngruppenbuch.Generate("book", Created, networks, new Random(2));

    /// <summary>Swaps each bigram with the one whose letters are mirrored in the alphabet: AB with ZY, QP with JK.</summary>
    public static Doppelbuchstabentauschtafel MirrorTable(int number = 1) =>
        new(number, Enumerable.Range(0, Bigram.Count / 2).Select(i => (Bigram.FromIndex(i), Bigram.FromIndex(Bigram.Count - 1 - i))));

    public static Kenngruppe FirstSchluesselkenngruppe(Kenngruppenbuch book, string network) =>
        book.Column(book.AllotmentOf(network)!.Columns.First)[0];

    public static Kenngruppe FirstVerfahrenkenngruppe(Kenngruppenbuch book) =>
        book.Column(Kenngruppenbuch.Verfahrenkenngruppen.First)[0];

    public static void Turn(EnigmaMachine machine, RotorPositions positions)
    {
        foreach (var (slot, position) in machine.Model.Slots.Zip(positions.Positions))
        {
            machine.TurnRotor(slot, position);
        }
    }

    /// <summary>Presses and releases each key the way the operator would, recording each lamp.</summary>
    public static string Type(OperatorProcedure procedure, EnigmaMachine machine, string keys)
    {
        var lamps = new List<Letter>();
        foreach (var key in keys.Select(Letter.FromChar))
        {
            procedure.CheckKey(key);
            var lamp = machine.PressKey(key);
            procedure.Record(machine, key, lamp);
            machine.ReleaseKey();
            procedure.Observe(machine);
            lamps.Add(lamp);
        }

        return string.Concat(lamps.Select(l => l.ToString()));
    }
}
