using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>
/// The Doppelbuchstabentauschtafeln for one year, and a calendar that gives each half month (days 1–15, 16–end) one
/// of them.
/// </summary>
public sealed class TauschtafelSet
{
    public const int TableCount = 9;

    public const int HalfMonths = 24;

    private readonly Doppelbuchstabentauschtafel[] _tables;
    private readonly int[] _calendar;

    /// <param name="calendar">The table number for each half month of the year, from early January to late December.</param>
    public TauschtafelSet(string id, int year, IEnumerable<Doppelbuchstabentauschtafel> tables, IEnumerable<int> calendar)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentNullException.ThrowIfNull(tables);
        ArgumentNullException.ThrowIfNull(calendar);

        _tables = [.. tables.OrderBy(t => t.Number)];
        if (!_tables.Select(t => t.Number).SequenceEqual(Enumerable.Range(1, TableCount)))
        {
            throw new DomainException($"A Tauschtafel set has tables 1–{TableCount}.");
        }

        _calendar = [.. calendar];
        if (_calendar.Length != HalfMonths || _calendar.Any(n => n is < 1 or > TableCount))
        {
            throw new DomainException($"A Tauschtafel calendar gives each of the {HalfMonths} half months a table 1–{TableCount}.");
        }

        Id = id;
        Year = new KeyMonth(year, 1).Year;
    }

    public string Id { get; }

    public int Year { get; }

    public IReadOnlyList<Doppelbuchstabentauschtafel> Tables => _tables;

    /// <summary>The table number for each half month, from early January to late December.</summary>
    public IReadOnlyList<int> Calendar => _calendar;

    /// <summary>Generates 9 tables; the calendar cycles through them in a random order.</summary>
    public static TauschtafelSet Generate(string id, int year, Random random)
    {
        ArgumentNullException.ThrowIfNull(random);

        var tables = Enumerable.Range(1, TableCount).Select(n => Doppelbuchstabentauschtafel.Generate(n, random)).ToList();
        var order = Enumerable.Range(1, TableCount).ToArray();
        random.Shuffle(order);
        return new TauschtafelSet(id, year, tables, Enumerable.Range(0, HalfMonths).Select(i => order[i % TableCount]));
    }

    /// <summary>The table in force on <paramref name="day"/> of <paramref name="month"/>.</summary>
    public Doppelbuchstabentauschtafel TableFor(KeyMonth month, int day)
    {
        if (month.Year != Year)
        {
            throw new DomainException($"The Tauschtafel set for {Year} does not cover {month}.");
        }

        if (day < 1 || day > month.Days)
        {
            throw new DomainException($"Day {day} is outside {month}.");
        }

        return _tables[_calendar[((month.Month - 1) * 2) + (day <= 15 ? 0 : 1)] - 1];
    }
}
