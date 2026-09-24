using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>Columns <see cref="First"/> to <see cref="Last"/> of a Kenngruppenbuch, numbered from 1.</summary>
public sealed record ColumnRange(int First, int Last)
{
    public int Count => Last - First + 1;

    public bool Contains(int column) => column >= First && column <= Last;

    public IEnumerable<int> Columns => Enumerable.Range(First, Count);
}

/// <summary>A line of the Zuteilungsliste: the columns of Schlüsselkenngruppen allotted to a network.</summary>
public sealed record Allotment(string Network, ColumnRange Columns);

/// <summary>
/// The Kenngruppenbuch: all 17,576 trigrams in 676 numbered columns of 26. Its Zuteilungsliste allots columns 1–100
/// to the Verfahrenkenngruppen and 20 columns to each network.
/// </summary>
public sealed class Kenngruppenbuch
{
    public const int ColumnCount = 676;

    public const int RowCount = 26;

    public const int ColumnsPerNetwork = 20;

    /// <summary>Kriegsmarine key nets that every generated book covers.</summary>
    public static IReadOnlyList<string> HistoricalNetworks { get; } =
        ["Aegir", "Hydra", "Medusa", "Neptun", "Niobe", "Sleipnir", "Süd", "Thetis", "Tibet", "Triton"];

    /// <summary>The columns of Verfahrenkenngruppen.</summary>
    public static ColumnRange Verfahrenkenngruppen { get; } = new(1, 100);

    private readonly Kenngruppe[][] _columns;
    private readonly List<Allotment> _allotments;
    private readonly Dictionary<Kenngruppe, (int Column, int Row)> _locations;

    public Kenngruppenbuch(string id, DateTimeOffset created, IReadOnlyList<IReadOnlyList<Kenngruppe>> columns, IEnumerable<Allotment> allotments)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentNullException.ThrowIfNull(columns);
        ArgumentNullException.ThrowIfNull(allotments);

        if (columns.Count != ColumnCount || columns.Any(c => c.Count != RowCount))
        {
            throw new DomainException($"A Kenngruppenbuch has {ColumnCount} columns of {RowCount} trigrams.");
        }

        Id = id;
        Created = created;
        _columns = [.. columns.Select(c => c.ToArray())];
        _locations = [];
        for (var column = 0; column < ColumnCount; column++)
        {
            for (var row = 0; row < RowCount; row++)
            {
                if (!_locations.TryAdd(_columns[column][row], (column + 1, row + 1)))
                {
                    throw new DomainException($"Trigram {_columns[column][row]} appears more than once in the Kenngruppenbuch.");
                }
            }
        }

        _allotments = [];
        foreach (var allotment in allotments)
        {
            Add(allotment);
        }
    }

    public string Id { get; }

    public DateTimeOffset Created { get; }

    /// <summary>The Zuteilungsliste, in the order the networks were allotted.</summary>
    public IReadOnlyList<Allotment> Allotments => _allotments;

    public bool HasFreeColumns => NextFree() is not null;

    public static Kenngruppenbuch Generate(string id, DateTimeOffset created, IEnumerable<string> networks, Random random)
    {
        ArgumentNullException.ThrowIfNull(networks);
        ArgumentNullException.ThrowIfNull(random);

        var trigrams = Enumerable.Range(0, Kenngruppe.Count).Select(Kenngruppe.FromIndex).ToArray();
        random.Shuffle(trigrams);
        var book = new Kenngruppenbuch(id, created, [.. trigrams.Chunk(RowCount)], []);
        foreach (var network in networks)
        {
            if (!book.Covers(network))
            {
                book.Allot(network);
            }
        }

        return book;
    }

    /// <summary>The trigrams of column <paramref name="number"/> (1–676), top to bottom.</summary>
    public IReadOnlyList<Kenngruppe> Column(int number) =>
        number is >= 1 and <= ColumnCount
            ? _columns[number - 1]
            : throw new DomainException($"Column {number} is outside 1–{ColumnCount}.");

    /// <summary>The column and row (both from 1) of <paramref name="kenngruppe"/>.</summary>
    public (int Column, int Row) Locate(Kenngruppe kenngruppe) => _locations[kenngruppe];

    public Allotment? AllotmentOf(string network) =>
        _allotments.FirstOrDefault(a => SameNetwork(a.Network, network));

    public bool Covers(string network) => AllotmentOf(network) is not null;

    /// <summary>Allots the next <see cref="ColumnsPerNetwork"/> free columns to <paramref name="network"/>.</summary>
    public void Allot(string network)
    {
        if (string.IsNullOrWhiteSpace(network))
        {
            throw new DomainException("An allotment needs a network name.");
        }

        var free = NextFree() ?? throw new DomainException("The Kenngruppenbuch has no free columns.");
        Add(new Allotment(network.Trim(), free));
    }

    public bool IsVerfahrenkenngruppe(Kenngruppe kenngruppe) => Verfahrenkenngruppen.Contains(Locate(kenngruppe).Column);

    public bool IsSchluesselkenngruppe(string network, Kenngruppe kenngruppe) =>
        AllotmentOf(network)?.Columns.Contains(Locate(kenngruppe).Column) ?? false;

    private void Add(Allotment allotment)
    {
        if (string.IsNullOrWhiteSpace(allotment.Network))
        {
            throw new DomainException("An allotment needs a network name.");
        }

        if (Covers(allotment.Network))
        {
            throw new DomainException($"Network {allotment.Network} is allotted more than once.");
        }

        var columns = allotment.Columns;
        if (columns.Count != ColumnsPerNetwork || columns.First <= Verfahrenkenngruppen.Last || columns.Last > ColumnCount)
        {
            throw new DomainException(
                $"Network {allotment.Network} needs {ColumnsPerNetwork} columns between {Verfahrenkenngruppen.Last + 1} and {ColumnCount}.");
        }

        if (_allotments.Any(a => a.Columns.First <= columns.Last && columns.First <= a.Columns.Last))
        {
            throw new DomainException($"The columns of network {allotment.Network} overlap another allotment.");
        }

        _allotments.Add(allotment);
    }

    private ColumnRange? NextFree()
    {
        for (var first = Verfahrenkenngruppen.Last + 1; first + ColumnsPerNetwork - 1 <= ColumnCount; first += ColumnsPerNetwork)
        {
            var range = new ColumnRange(first, first + ColumnsPerNetwork - 1);
            if (!_allotments.Any(a => a.Columns.First <= range.Last && range.First <= a.Columns.Last))
            {
                return range;
            }
        }

        return null;
    }

    private static bool SameNetwork(string a, string b) =>
        string.Equals(a.Trim(), b?.Trim(), StringComparison.OrdinalIgnoreCase);
}
