using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>
///     One issue of the Spruchschlüsseltafel für Wetterkurzfunksprüche, named by its Kennwort (such as Weimar): for each
///     six-hour period of the day, a three-letter setting for each indicator letter. On the M4 the Greek rotor stands
///     at A.
/// </summary>
public sealed class WetterTafel
{
    public const int Periods = 4;

    public WetterTafel(string kennwort, DateOnly from, DateOnly until, IEnumerable<SettingList> periods)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(kennwort);
        ArgumentNullException.ThrowIfNull(periods);

        if (until < from) throw new DomainException($"Weather table {kennwort} ends before it starts.");

        Columns = [.. periods];
        if (Columns.Count != Periods || Columns.Any(c => c.Width != 3))
            throw new DomainException(
                $"Weather table {kennwort} has {Periods} columns of three-letter settings, one for each six hours.");

        Kennwort = kennwort;
        From = from;
        Until = until;
    }

    public string Kennwort { get; }

    /// <summary>The first day the table is in force.</summary>
    public DateOnly From { get; }

    /// <summary>The last day the table is in force.</summary>
    public DateOnly Until { get; }

    /// <summary>The settings for 0000–0559, 0600–1159, 1200–1759 and 1800–2359.</summary>
    public IReadOnlyList<SettingList> Columns { get; }

    public bool IsInForceOn(DateOnly date)
    {
        return date >= From && date <= Until;
    }
}

/// <summary>
///     The weather short-signal tables in force during one year, in order. 20 January 1942 to 9 March 1943 follow the
///     historical issues Weimar, Eisenach and Naumburg; otherwise a new table comes into force every quarter.
/// </summary>
public sealed class WetterTafelSet
{
    private static readonly (DateOnly From, string Kennwort)[] HistoricalIssues =
    [
        (new DateOnly(1942, 1, 20), "Weimar"),
        (new DateOnly(1942, 10, 25), "Eisenach"),
        (new DateOnly(1943, 1, 11), "Naumburg")
    ];

    private static readonly DateOnly HistoricalEnd = new(1943, 3, 10);

    private static readonly int[] QuarterMonths = [1, 4, 7, 10];

    private static readonly string[] Kennwoerter =
    [
        "Gotha", "Erfurt", "Jena", "Arnstadt", "Ilmenau", "Saalfeld", "Rudolstadt", "Apolda", "Gera", "Altenburg",
        "Greiz", "Meiningen", "Suhl", "Schleiz", "Sonneberg", "Nordhausen"
    ];

    public WetterTafelSet(string id, int year, IEnumerable<WetterTafel> issues)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentNullException.ThrowIfNull(issues);

        Year = new KeyMonth(year, 1).Year;
        Issues = [.. issues.OrderBy(i => i.From)];
        if (Issues.Count == 0
            || Issues[0].From > new DateOnly(Year, 1, 1)
            || Issues[^1].Until < new DateOnly(Year, 12, 31)
            || Issues.Zip(Issues.Skip(1)).Any(pair => pair.First.Until.AddDays(1) != pair.Second.From))
            throw new DomainException($"The weather tables for {Year} must follow each other and cover the year.");

        Id = id;
    }

    public string Id { get; }

    public int Year { get; }

    /// <summary>The issues in force during the year, in order; the first and last may reach into other years.</summary>
    public IReadOnlyList<WetterTafel> Issues { get; }

    /// <summary>
    ///     Generates the issues of <paramref name="year" />. The historical issues get the same settings in every set, so
    ///     an issue that spans two years matches.
    /// </summary>
    public static WetterTafelSet Generate(string id, int year, Random random)
    {
        ArgumentNullException.ThrowIfNull(random);

        var first = Math.Max(1, year - 1);
        var quarters = Enumerable.Range(first, Math.Min(9999, year + 1) - first + 1)
            .SelectMany(y => QuarterMonths.Select(month => new DateOnly(y, month, 1)))
            .Where(from => from < HistoricalIssues[0].From || from >= HistoricalEnd)
            .Append(HistoricalEnd)
            .Select(from => (From: from, Kennwort: (string?)null));
        var starts = quarters.Concat(HistoricalIssues.Select(h => (h.From, Kennwort: (string?)h.Kennwort)))
            .OrderBy(s => s.From)
            .ToList();
        var names = Kennwoerter.ToArray();
        random.Shuffle(names);
        var next = 0;
        var issues = new List<WetterTafel>();
        for (var i = 0; i < starts.Count; i++)
        {
            var (from, kennwort) = starts[i];
            var until = i + 1 < starts.Count ? starts[i + 1].From.AddDays(-1) : new DateOnly(from.Year, 12, 31);
            if (until.Year < year || from.Year > year) continue;

            var issueRandom = kennwort is null ? random : new Random(Seed(kennwort));
            issues.Add(new WetterTafel(kennwort ?? names[next++ % names.Length], from, until,
                Enumerable.Range(0, WetterTafel.Periods).Select(_ => SettingList.Generate(3, issueRandom))));
        }

        return new WetterTafelSet(id, year, issues);
    }

    /// <summary>The setting for <paramref name="indicator" /> at <paramref name="hour" /> on <paramref name="date" />.</summary>
    public RotorPositions SettingFor(DateOnly date, int hour, Letter indicator)
    {
        if (hour is < 0 or > 23) throw new DomainException($"Hour {hour} is outside 0–23.");

        var issue = Issues.FirstOrDefault(i => i.IsInForceOn(date) && date.Year == Year)
                    ?? throw new DomainException($"The weather tables for {Year} do not cover {date:yyyy-MM-dd}.");
        return issue.Columns[hour / 6][indicator];
    }

    /// <summary>True when <paramref name="other" /> has the same id, year and issues.</summary>
    public bool IsSameAs(WetterTafelSet other)
    {
        ArgumentNullException.ThrowIfNull(other);

        return other.Id == Id
               && other.Year == Year
               && other.Issues.Count == Issues.Count
               && other.Issues.Zip(Issues).All(pair =>
                   pair.First.Kennwort == pair.Second.Kennwort
                   && pair.First.From == pair.Second.From
                   && pair.First.Until == pair.Second.Until
                   && pair.First.Columns.Zip(pair.Second.Columns)
                       .All(c => c.First.Settings.SequenceEqual(c.Second.Settings)));
    }

    private static int Seed(string kennwort)
    {
        return kennwort.Aggregate(17, (hash, c) => unchecked(hash * 31 + c));
    }
}
