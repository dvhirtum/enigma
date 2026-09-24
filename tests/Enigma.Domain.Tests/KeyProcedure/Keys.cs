using System.Globalization;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

internal static class Keys
{
    /// <summary>Builds a daily key from key-sheet notation, e.g. rotors "Beta II IV I", rings "01 01 01 22".</summary>
    public static DailyKey Day(int day, string reflector, string rotors, string rings, string plugs = "", string kenngruppen = "") =>
        new(
            day,
            ReflectorType.FromName(reflector),
            [.. Split(rotors).Select(RotorType.FromName)],
            [.. Split(rings).Select(r => RingSetting.FromNumber(int.Parse(r, CultureInfo.InvariantCulture)))],
            [.. Split(plugs).Select(PlugPair.Parse)],
            [.. Split(kenngruppen).Select(Kenngruppe.Parse)]);

    public static DailyKey M3(int day) => Day(day, "B", "I II III", "01 01 01");

    public static DailyKey M4(int day) => Day(day, "B-thin", "Beta I II III", "01 01 01 01");

    private static string[] Split(string value) => value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
}
