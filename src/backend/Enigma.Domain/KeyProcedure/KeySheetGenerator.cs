using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>
///     Generates key sheets the Navy way. The inner setting (reflector, Walzenlage and rings) changes every other day,
///     the plugs and the Grundstellung change daily. Every Walzenlage includes one of the Navy rotors VI–VIII. Each day
///     gets 10 plug pairs.
/// </summary>
public static class KeySheetGenerator
{
    public const int PlugPairs = 10;

    private static readonly RotorType[] NavyRotors = [RotorType.VI, RotorType.VII, RotorType.VIII];

    public static KeySheet Generate(string id, MachineModel model, string network, KeyMonth month, Random random)
    {
        ArgumentNullException.ThrowIfNull(model);
        ArgumentNullException.ThrowIfNull(random);

        var keys = new List<DailyKey>();

        for (var first = 1; first <= month.Days; first += 2)
        {
            var (reflector, rotors, rings) = InnerSetting(model, random);
            for (var day = first; day <= Math.Min(first + 1, month.Days); day++)
                keys.Add(new DailyKey(day, reflector, rotors, rings, Plugs(random),
                    Grundstellung(rotors.Length, random)));
        }

        return new KeySheet(id, network, month, Provenance.Generated, keys);
    }

    internal static (ReflectorType, RotorType[], RingSetting[]) InnerSetting(MachineModel model, Random random)
    {
        var reflectors = ReflectorType.All.Where(r => r.IsThin == model.HasGreekSlot).ToArray();
        var reflector = reflectors[random.Next(reflectors.Length)];

        RotorType[] rotors;
        do
        {
            rotors = [.. Shuffle(RotorType.All.Where(r => !r.IsGreek), random).Take(3)];
        } while (!rotors.Intersect(NavyRotors).Any());

        if (model.HasGreekSlot) rotors = [random.Next(2) == 0 ? RotorType.Beta : RotorType.Gamma, .. rotors];

        RingSetting[] rings = [.. rotors.Select(_ => RingSetting.FromNumber(random.Next(1, Letter.Count + 1)))];
        return (reflector, rotors, rings);
    }

    internal static PlugPair[] Plugs(Random random)
    {
        var letters = Shuffle(Enumerable.Range(0, Letter.Count).Select(Letter.FromIndex), random);
        return [.. Enumerable.Range(0, PlugPairs).Select(i => PlugPair.Create(letters[2 * i], letters[2 * i + 1]))];
    }

    private static RotorPositions Grundstellung(int rotors, Random random)
    {
        return new RotorPositions(Enumerable.Range(0, rotors)
            .Select(_ => new RotorPosition(Letter.FromIndex(random.Next(Letter.Count)))));
    }

    private static T[] Shuffle<T>(IEnumerable<T> items, Random random)
    {
        var array = items.ToArray();
        random.Shuffle(array);
        return array;
    }
}
