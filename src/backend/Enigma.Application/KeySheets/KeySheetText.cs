using System.Globalization;
using System.Text;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.KeySheets;

/// <summary>
/// Daily keys as text, one row per day in Navy column order:
/// day, reflector, Walzenlage, rings (01–26), plugs, Kenngruppen.
/// For example <c>1 B-thin Beta II IV I 01 01 01 22 AT BL DF GJ HM NW OP QY RZ VX ABC DEF</c>.
/// Blank lines and lines starting with # are skipped.
/// </summary>
public static class KeySheetText
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

    public static string Format(IEnumerable<DailyKey> keys)
    {
        ArgumentNullException.ThrowIfNull(keys);

        var text = new StringBuilder();
        foreach (var key in keys)
        {
            IEnumerable<string> fields =
            [
                key.Day.ToString(CultureInfo.InvariantCulture),
                key.Reflector.Name,
                .. key.Rotors.Select(r => r.Name),
                .. key.Rings.Select(r => r.ToString()),
                .. key.Plugs.Select(p => p.ToString()),
                .. key.Kenngruppen.Select(k => k.ToString()),
            ];
            text.Append(string.Join(' ', fields)).Append('\n');
        }

        return text.ToString();
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

        var kenngruppen = new List<Kenngruppe>();
        while (tokens.Count > 0)
        {
            kenngruppen.Add(Kenngruppe.Parse(tokens.Dequeue()));
        }

        return new DailyKey(day, reflector, rotors, rings, plugs, kenngruppen);
    }

    private static bool IsNumber(string token) => token.Length is 1 or 2 && token.All(char.IsAsciiDigit);

    private static bool Same(string name, string token) => string.Equals(name, token, StringComparison.OrdinalIgnoreCase);
}
