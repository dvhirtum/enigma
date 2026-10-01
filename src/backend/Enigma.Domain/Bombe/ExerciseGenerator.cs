using System.Globalization;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// Generates a Bombe exercise: a Navy message from a template, encrypted with a key sheet day by the full procedure
/// (Kenngruppen, bigram table, message key). The template's stereotyped phrase is the likely crib; it may follow a
/// short prefix. Words are separated by X and numbers are spelled out digit by digit. Also generates the day's other
/// messages, from the same templates and a few more.
/// </summary>
public static class ExerciseGenerator
{
    /// <summary>The fewest other messages of the day.</summary>
    public const int MinDayMessages = 3;

    /// <summary>The most other messages of the day.</summary>
    public const int MaxDayMessages = 5;

    private static readonly string[] Digits = ["NUL", "EINS", "ZWO", "DREI", "VIER", "FUENF", "SEQS", "SIEBEN", "AQT", "NEUN"];

    private static readonly string[] Directions = ["NORD", "NORDOST", "OST", "SUEDOST", "SUED", "SUEDWEST", "WEST", "NORDWEST"];

    private static readonly string[] Areas = ["NORDSEE", "SKAGERRAK", "NORDMEER", "ISLAND", "FAEROER", "BISKAYA", "IRLAND"];

    private static readonly string[] Vessels = ["VORPOSTENBOOT", "SPERRBRECHER", "MINENSUQBOOT", "UJAEGER"];

    private static readonly Template[] Templates =
    [
        new(
            MessageType.Weather,
            random => Pick(random, "", "AN ALLE X ", $"{Number(random, 0, 23)} UHR X "),
            random => $"X {Pick(random, Areas)} X WIND {Pick(random, Directions)} {Number(random, 1, 9)} X SEEGANG {Number(random, 1, 7)} X "
                + $"LUFTDRUCK {Number(random, 980, 1035)} X SICHT {Number(random, 1, 20)} SM"),
        new(
            MessageType.NothingToReport,
            random => Pick(random, "", $"VON {Pick(random, Vessels)} {Number(random, 1, 40)} X ", $"{Number(random, 0, 23)} UHR X "),
            _ => string.Empty),
        new(
            MessageType.OwnPosition,
            random => Pick(random, "", "AN BDU X ", $"VON U {Number(random, 100, 999)} X "),
            random => $"{Square(random)} X KURS {Number(random, 0, 359)} X FAHRT {Number(random, 5, 17)} SM"),
        new(
            MessageType.Convoy,
            random => Pick(random, "", "AN BDU X ", $"VON U {Number(random, 100, 999)} X "),
            random => $"X IN QU {Square(random)} X KURS {Number(random, 0, 359)} X FAHRT {Number(random, 6, 12)} SM X "
                + $"{Number(random, 10, 60)} DAMPFER {Number(random, 2, 9)} ZERSTOERER"),
    ];

    // Rendezvous order, mine warning and air attack report: only for the day's other messages, without a crib.
    private static readonly Template[] DayTemplates =
    [
        new(
            null,
            random => $"AN U {Number(random, 100, 999)} X ",
            random => $"TREFFPUNKT QU {Square(random)} X UHRZEIT {Number(random, 0, 23)} UHR X "
                + $"{Pick(random, "VERSORGER", "SPERRBRECHER", "GELEIT")} ERWARTET"),
        new(
            null,
            random => Pick(random, "", "AN ALLE X "),
            random => $"MINENWARNUNG X {Pick(random, Areas)} X MINEN IN QU {Square(random)} X {Pick(random, "WEG GESPERRT", "NUR MIT GELEIT")}"),
        new(
            null,
            random => Pick(random, "", "AN BDU X ", $"VON U {Number(random, 100, 999)} X "),
            random => $"FLIEGERANGRIFF IN QU {Square(random)} X {Number(random, 2, 12)} FLUGZEUGE X "
                + Pick(random, "KEINE SQAEDEN", "LEIQTE SQAEDEN", "TAUQKLAR")),
    ];

    /// <summary>Generates an exercise sent on <paramref name="day"/> of an M3 <paramref name="sheet"/>.</summary>
    public static MessageSource Generate(KeySheet sheet, int day, Kenngruppenbuch book, TauschtafelSet tables, Random random)
    {
        var allotment = Allotment(sheet, day, book, tables, random);
        var (template, prefix, plaintext) = Compose(Templates, random);
        var (message, solution) = Send(sheet, day, book, tables, random, allotment, plaintext);
        solution = solution with { Notes = $"{solution.Notes} The crib starts at position {prefix.Length}." };

        var date = new DateOnly(sheet.Month.Year, sheet.Month.Month, day);
        var type = template.Type!;
        return new MessageSource(
            SourceKind.Exercise,
            $"Exercise, {date.ToString("d MMMM yyyy", CultureInfo.InvariantCulture)}",
            $"Sent at {message.TimeOfOrigin!.Value.ToString("HHmm", CultureInfo.InvariantCulture)}. {type.Hint}",
            message.ToString(),
            message,
            MessageSource.Letters(message.CipherText),
            type.Crib,
            solution,
            type.Place);
    }

    /// <summary>
    /// Generates the other messages sent on <paramref name="day"/> of an M3 <paramref name="sheet"/>: between
    /// <see cref="MinDayMessages"/> and <see cref="MaxDayMessages"/>, in the order of their time of origin.
    /// </summary>
    public static IReadOnlyList<DayMessage> DayTraffic(KeySheet sheet, int day, Kenngruppenbuch book, TauschtafelSet tables, Random random)
    {
        var allotment = Allotment(sheet, day, book, tables, random);
        Template[] templates = [.. Templates, .. DayTemplates];
        return
        [
            .. Enumerable.Range(0, random.Next(MinDayMessages, MaxDayMessages + 1))
                .Select(_ => Send(sheet, day, book, tables, random, allotment, Compose(templates, random).PlainText))
                .Select(sent => new DayMessage(sent.Message, sent.Solution))
                .OrderBy(message => message.Message.TimeOfOrigin),
        ];
    }

    /// <summary>The plain text of a random template, before padding.</summary>
    public static string PlainText(Random random)
    {
        ArgumentNullException.ThrowIfNull(random);

        return Compose(Templates, random).PlainText;
    }

    // Checks the day can send Navy messages, and gives the network's Kenngruppen columns.
    private static Allotment Allotment(KeySheet sheet, int day, Kenngruppenbuch book, TauschtafelSet tables, Random random)
    {
        ArgumentNullException.ThrowIfNull(sheet);
        ArgumentNullException.ThrowIfNull(book);
        ArgumentNullException.ThrowIfNull(tables);
        ArgumentNullException.ThrowIfNull(random);

        if (sheet.Model != MachineModel.M3)
        {
            throw new DomainException("The three-rotor Bombe needs an M3 key sheet.");
        }

        _ = sheet.KeyFor(day).Grundstellung
            ?? throw new DomainException($"Day {day} of {sheet.Network} {sheet.Month} has no Grundstellung.");
        return book.AllotmentOf(sheet.Network)
            ?? throw new DomainException($"{sheet.Network} has no columns in the Kenngruppenbuch.");
    }

    // Sends the plain text on the day by the Navy procedure, with a random indicator and time of origin.
    private static (RadioMessage Message, Solution Solution) Send(
        KeySheet sheet, int day, Kenngruppenbuch book, TauschtafelSet tables, Random random, Allotment allotment, string plaintext)
    {
        var key = sheet.KeyFor(day);
        var grundstellung = key.Grundstellung!;
        var group = RadioMessage.GroupLength;
        plaintext += new string('X', (group - (plaintext.Length % group)) % group);

        var indicator = new Indicator(
            RandomKenngruppe(book, allotment.Columns, random),
            RandomKenngruppe(book, Kenngruppenbuch.Verfahrenkenngruppen, random),
            RandomLetter(random),
            RandomLetter(random));
        var messageKey = MessageKey.Derive(key, grundstellung, indicator.Verfahrenkenngruppe);
        var solution = new Solution(
            key.Reflector,
            new WheelOrder(key.Rotors[0], key.Rotors[1], key.Rotors[2]),
            key.Rings,
            key.Plugs,
            messageKey.Spruchschluessel,
            plaintext,
            $"{sheet.Network} {sheet.Month}, day {day}: Grundstellung {grundstellung}, Schlüsselkenngruppe "
            + $"{indicator.Schluesselkenngruppe}, Verfahrenkenngruppe {indicator.Verfahrenkenngruppe}, Spruchschlüssel "
            + $"{messageKey.Spruchschluessel}.")
        {
            Exercise = new ExerciseKey(sheet.Id, sheet.Network, sheet.Month, day, grundstellung, indicator),
        };

        var time = new TimeOnly(random.Next(24), random.Next(60));
        var groups = indicator.Encrypt(tables.TableFor(sheet.Month, day));
        return (RadioMessage.Create(time, groups, solution.Decrypt(MessageSource.Letters(plaintext))), solution);
    }

    private static (Template Template, string Prefix, string PlainText) Compose(Template[] templates, Random random)
    {
        var template = templates[random.Next(templates.Length)];
        var prefix = Compact(template.Prefix(random));
        return (template, prefix, prefix + template.Type?.Crib.ToString() + Compact(template.Body(random)));
    }

    private static Kenngruppe RandomKenngruppe(Kenngruppenbuch book, ColumnRange columns, Random random) =>
        book.Column(columns.First + random.Next(columns.Count))[random.Next(Kenngruppenbuch.RowCount)];

    private static Letter RandomLetter(Random random) => Letter.FromIndex(random.Next(Letter.Count));

    private static string Pick(Random random, params string[] choices) => choices[random.Next(choices.Length)];

    private static string Number(Random random, int min, int max) =>
        string.Join(' ', random.Next(min, max + 1).ToString(CultureInfo.InvariantCulture).Select(digit => Digits[digit - '0']));

    // A naval grid square such as AC 4992, written QU AAA CCC VIER NEUN NEUN ZWO.
    private static string Square(Random random)
    {
        var first = RandomLetter(random).ToString();
        var second = RandomLetter(random).ToString();
        var digits = string.Join(' ', Enumerable.Range(0, 4).Select(_ => Digits[random.Next(1, 10)]));
        return $"{first}{first}{first} {second}{second}{second} {digits}";
    }

    private static string Compact(string text) => string.Concat(text.Where(c => c != ' '));

    /// <summary>A message template: the kind of message with its crib (none for the day's other messages), a prefix and a body.</summary>
    private sealed record Template(MessageType? Type, Func<Random, string> Prefix, Func<Random, string> Body);
}
