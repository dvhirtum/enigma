using System.Globalization;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.KeySheets;

/// <summary>
/// Builds test daily keys from text, one row per day in Navy column order:
/// day, reflector, Walzenlage, rings (01–26), plugs, Grundstellung (optional).
/// For example <c>1 B-thin Beta II IV I 01 01 01 22 AT BL DF GJ HM NW OP QY RZ VX QRSA</c>.
/// Blank lines and lines starting with # are skipped.
/// </summary>
internal static class KeySheetText
{
    public static IReadOnlyList<DailyKey> Parse(string text)
    {
        ArgumentNullException.ThrowIfNull(text);

        var keys = new List<DailyKey>();
        var lines = text.Split('\n');
        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (line.Length == 0 || line.StartsWith('#'))
            {
                continue;
            }

            try
            {
                keys.Add(ParseRow(line));
            }
            catch (DomainException exception)
            {
                throw new DomainException($"Line {i + 1}: {exception.Message}", exception);
            }
        }

        return keys;
    }

    private static DailyKey ParseRow(string line)
    {
        var tokens = new Queue<string>(line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

        var day = int.TryParse(tokens.Dequeue(), NumberStyles.None, CultureInfo.InvariantCulture, out var number)
            ? number
            : throw new DomainException("A row starts with the day of the month.");

        var reflectorName = tokens.Count > 0 ? tokens.Dequeue() : string.Empty;
        var reflector = ReflectorType.All.FirstOrDefault(r => Same(r.Name, reflectorName))
            ?? throw new DomainException($"Unknown reflector '{reflectorName}'.");

        var rotors = new List<RotorType>();
        while (tokens.Count > 0 && !IsNumber(tokens.Peek()))
        {
            var name = tokens.Dequeue();
            rotors.Add(RotorType.All.FirstOrDefault(r => Same(r.Name, name))
                ?? throw new DomainException($"Unknown rotor '{name}'."));
        }

        var rings = new List<RingSetting>();
        while (tokens.Count > 0 && IsNumber(tokens.Peek()))
        {
            rings.Add(RingSetting.FromNumber(int.Parse(tokens.Dequeue(), CultureInfo.InvariantCulture)));
        }

        var plugs = new List<PlugPair>();
        while (tokens.Count > 0 && tokens.Peek().Length == 2)
        {
            plugs.Add(PlugPair.Parse(tokens.Dequeue()));
        }

        var grundstellung = tokens.Count > 0 ? RotorPositions.Parse(tokens.Dequeue()) : null;
        if (tokens.Count > 0)
        {
            throw new DomainException($"Unexpected '{tokens.Peek()}' after the Grundstellung.");
        }

        return new DailyKey(day, reflector, rotors, rings, plugs, grundstellung);
    }

    private static bool IsNumber(string token) => token.Length is 1 or 2 && token.All(char.IsAsciiDigit);

    private static bool Same(string name, string token) => string.Equals(name, token, StringComparison.OrdinalIgnoreCase);
}
