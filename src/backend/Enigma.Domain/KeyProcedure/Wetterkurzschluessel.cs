namespace Enigma.Domain.KeyProcedure;

/// <summary>A row of a weather table: its heading and its cells. A row with one cell spans the table.</summary>
public sealed record WetterZeile(string Heading, IReadOnlyList<string> Cells);

/// <summary>
///     A table of the Wetterkurzschlüssel. <see cref="Historical" /> is true when Mahon gives the table or its rule;
///     the others are reconstructed in the same style.
/// </summary>
public sealed record WetterTabelle(
    int Number,
    string Title,
    bool Historical,
    IReadOnlyList<string> Columns,
    IReadOnlyList<WetterZeile> Rows);

/// <summary>
///     The Wetterkurzschlüssel, 2nd edition (in force 20.1.42–10.3.43): nine tables that turn a weather report into nine
///     letters, followed by a two-letter signature. The letters are sent in the order of <see cref="Order" />, not in
///     table order.
/// </summary>
public static class Wetterkurzschluessel
{
    public const int SignatureLetters = 2;

    private const string Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    private static readonly string[] Directions = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];

    /// <summary>The table for each letter of the report: letter 6 is table 8, letter 7 table 6, letter 8 table 7.</summary>
    public static IReadOnlyList<int> Order { get; } = [1, 2, 3, 4, 5, 8, 6, 7, 9];

    public static IReadOnlyList<WetterTabelle> Tables { get; } =
    [
        new(1, "Breite (Grad Nord)", false, ["Breite"],
            Letters(i => string.Join("  ", new[] { i, 26 + i, 52 + i, 78 + i }.Where(d => d < 90).Select(d => $"{d}°")))),
        new(2, "Länge (Grad West oder Ost)", false, ["Länge"],
            Letters(i => $"{i}°  {26 + i}°  {52 + i}°")),
        new(3, "Allgemeines Gebiet und Luftdruckänderung", false, ["steigend", "gleich", "fallend"],
        [
            .. new[]
            {
                "52–77° N, 52–77° W", "52–77° N, 26–51° W", "52–77° N, 0–25° W", "52–77° N, 0–25° O",
                "26–51° N, 52–77° W", "26–51° N, 26–51° W", "26–51° N, 0–25° W", "26–51° N, 0–25° O"
            }.Select((area, i) => Three(area, i)),
            new WetterZeile("Gebiet außerhalb", ["Y"]),
            new WetterZeile("nicht beobachtet", ["Z"])
        ]),
        new(4, "Luftdruck (Millibar, auf 2 mb)", false, ["Luftdruck"],
            Letters(i => i switch
            {
                0 => "976 und darunter",
                25 => "1026 und darüber",
                _ => $"{976 + 2 * i}"
            })),
        new(5, "Lufttemperatur (Grad Celsius)", true, ["Temperatur"],
            Letters(i => string.Join("  ", new[] { i - 25, i + 1, i + 27 }.Where(t => t <= 35).Select(Signed)))),
        new(6, "Gegenwärtiges Wetter und Bewölkung", false, ["0–2/8", "3–6/8", "7–8/8"],
        [
            .. new[] { "trocken", "Dunst", "Nebel", "Sprühregen", "Regen", "Schnee", "Schauer", "Gewitter" }
                .Select((weather, i) => Three(weather, i)),
            new WetterZeile("Hagel", ["Y"]),
            new WetterZeile("nicht beobachtet", ["Z"])
        ]),
        new(7, "Sicht", false, ["Sicht"],
        [
            .. new[]
            {
                "unter 50 m", "50 m", "100 m", "200 m", "300 m", "500 m", "700 m", "1 km", "1,5 km", "2 km", "3 km",
                "4 km", "5 km", "6 km", "7 km", "8 km", "10 km", "12 km", "15 km", "20 km", "25 km", "30 km", "40 km",
                "50 km", "über 50 km", "nicht beobachtet"
            }.Select((visibility, i) => new WetterZeile(Alphabet[i].ToString(), [visibility]))
        ]),
        new(8, "Windrichtung und Windstärke (Beaufort)", false, ["1–3", "4–6", "7–12"],
        [
            .. Directions.Select((direction, i) => Three(direction, i)),
            new WetterZeile("Windstille", ["Y"]),
            new WetterZeile("umlaufend", ["Z"])
        ]),
        new(9, "Richtung und Art der Dünung", true, ["schwach", "mäßig", "schwer"],
        [
            .. Directions.Select((direction, i) => Three(direction, i)),
            new WetterZeile("keine Dünung", ["Y"]),
            new WetterZeile("Kreuzsee", ["Z"])
        ])
    ];

    /// <summary>Rows A–Z, each giving the readings of that letter.</summary>
    private static WetterZeile[] Letters(Func<int, string> reading)
    {
        return [.. Alphabet.Select((letter, i) => new WetterZeile(letter.ToString(), [reading(i)]))];
    }

    /// <summary>Row <paramref name="index" /> of a table of three columns: A–H, I–P and Q–X.</summary>
    private static WetterZeile Three(string heading, int index)
    {
        return new WetterZeile(heading,
            [Alphabet[index].ToString(), Alphabet[8 + index].ToString(), Alphabet[16 + index].ToString()]);
    }

    private static string Signed(int value)
    {
        return value > 0 ? $"+{value}" : value.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }
}
