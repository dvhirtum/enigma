using System.Globalization;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

internal static class Keys
{
    /// <summary>Builds a daily key from key-sheet notation, e.g. rotors "Beta II IV I", rings "01 01 01 22".</summary>
    public static DailyKey Day(int day, string reflector, string rotors, string rings, string plugs = "",
        string? grundstellung = null)
    {
        return new DailyKey(
            day,
            ReflectorType.FromName(reflector),
            [.. Split(rotors).Select(RotorType.FromName)],
            [.. Split(rings).Select(r => RingSetting.FromNumber(int.Parse(r, CultureInfo.InvariantCulture)))],
            [.. Split(plugs).Select(PlugPair.Parse)],
            grundstellung is null ? null : RotorPositions.Parse(grundstellung));
    }

    public static DailyKey M3(int day)
    {
        return Day(day, "B", "I II III", "01 01 01");
    }

    public static DailyKey M4(int day)
    {
        return Day(day, "B-thin", "Beta I II III", "01 01 01 01");
    }

    private static string[] Split(string value)
    {
        return value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
    }
}
