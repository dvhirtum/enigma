using System.Globalization;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Procedure;

/// <summary>Columns <see cref="First" /> to <see cref="Last" />, numbered from 1.</summary>
public sealed record ColumnRangeDocument(int First, int Last);

public sealed record AllotmentDocument(string Network, int First, int Last);

/// <summary>A Kenngruppenbuch as stored and shown. Each column is 26 trigrams separated by spaces.</summary>
public sealed record KenngruppenbuchDocument(
    string Id,
    DateTimeOffset Created,
    ColumnRangeDocument Verfahrenkenngruppen,
    IReadOnlyList<AllotmentDocument> Allotments,
    IReadOnlyList<string> Columns);

/// <summary>A bigram table. Each swap is 4 letters: "ABCD" swaps AB and CD.</summary>
public sealed record TauschtafelDocument(int Number, IReadOnlyList<string> Swaps);

/// <summary>A Tauschtafel set as stored and shown. <see cref="Calendar" /> gives the table for each half month.</summary>
public sealed record TauschtafelSetDocument(
    string Id,
    int Year,
    IReadOnlyList<TauschtafelDocument> Tables,
    IReadOnlyList<int> Calendar);

public static class ProcedureMapper
{
    public static KenngruppenbuchDocument ToDocument(Kenngruppenbuch book)
    {
        ArgumentNullException.ThrowIfNull(book);

        return new KenngruppenbuchDocument(
            book.Id,
            book.Created,
            new ColumnRangeDocument(Kenngruppenbuch.Verfahrenkenngruppen.First,
                Kenngruppenbuch.Verfahrenkenngruppen.Last),
            [.. book.Allotments.Select(a => new AllotmentDocument(a.Network, a.Columns.First, a.Columns.Last))],
            [.. Enumerable.Range(1, Kenngruppenbuch.ColumnCount).Select(n => string.Join(' ', book.Column(n)))]);
    }

    /// <summary>Builds a book from a document. Bad data throws <see cref="DomainException" />.</summary>
    public static Kenngruppenbuch FromDocument(KenngruppenbuchDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        if (document is not { Columns: not null, Allotments: not null })
            throw new DomainException("A Kenngruppenbuch file needs columns and allotments.");

        return new Kenngruppenbuch(
            document.Id,
            document.Created,
            [
                .. document.Columns.Select(c => (IReadOnlyList<Kenngruppe>)
                    [.. c.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(Kenngruppe.Parse)])
            ],
            document.Allotments.Select(a => new Allotment(a.Network, new ColumnRange(a.First, a.Last))));
    }

    public static TauschtafelSetDocument ToDocument(TauschtafelSet set)
    {
        ArgumentNullException.ThrowIfNull(set);

        return new TauschtafelSetDocument(
            set.Id,
            set.Year,
            [.. set.Tables.Select(t => new TauschtafelDocument(t.Number, [.. t.Swaps.Select(s => $"{s.A}{s.B}")]))],
            set.Calendar);
    }

    public static TauschtafelSet FromDocument(TauschtafelSetDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        if (document is not { Tables: not null, Calendar: not null })
            throw new DomainException("A Tauschtafel file needs tables and a calendar.");

        return new TauschtafelSet(
            document.Id,
            document.Year,
            document.Tables.Select(t => new Doppelbuchstabentauschtafel(
                t.Number,
                (t.Swaps ?? []).Select(s => s.Length == 4
                    ? (Bigram.Parse(s[..2]), Bigram.Parse(s[2..]))
                    : throw new DomainException($"'{s}' is not a swap of two bigrams.")))),
            document.Calendar);
    }
}

public sealed record StichwortDocument(string Name, string Word);

/// <summary>A year's Stichwort envelopes as stored and shown.</summary>
public sealed record StichwortSetDocument(string Id, int Year, IReadOnlyList<StichwortDocument> Envelopes);

/// <summary>
///     A weather short-signal table: dates such as "1942-01-20", and four columns (one for each six hours) of 26
///     settings each.
/// </summary>
public sealed record WetterTafelDocument(
    string Kennwort,
    string From,
    string Until,
    IReadOnlyList<IReadOnlyList<string>> Columns);

/// <summary>The weather short-signal tables in force during a year, as stored and shown.</summary>
public sealed record WetterTafelSetDocument(string Id, int Year, IReadOnlyList<WetterTafelDocument> Issues);

public sealed record WetterZeileDocument(string Heading, IReadOnlyList<string> Cells);

public sealed record WetterTabelleDocument(
    int Number,
    string Title,
    bool Historical,
    IReadOnlyList<string> Columns,
    IReadOnlyList<WetterZeileDocument> Rows);

/// <summary>The Wetterkurzschlüssel: its tables, and the table for each letter of a report.</summary>
public sealed record WetterkurzschluesselDocument(
    IReadOnlyList<int> Order,
    int SignatureLetters,
    IReadOnlyList<WetterTabelleDocument> Tables);

public static class YearlyProcedureMapper
{
    private const string DateFormat = "yyyy-MM-dd";

    public static StichwortSetDocument ToDocument(StichwortSet set)
    {
        ArgumentNullException.ThrowIfNull(set);

        return new StichwortSetDocument(set.Id, set.Year,
            [.. set.Envelopes.Select(e => new StichwortDocument(e.Name, e.Word))]);
    }

    public static StichwortSet FromDocument(StichwortSetDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        if (document.Envelopes is null) throw new DomainException("A Stichwort file needs envelopes.");

        return new StichwortSet(document.Id, document.Year,
            document.Envelopes.Select(e => new Stichwort(e.Name, e.Word)));
    }

    public static WetterTafelSetDocument ToDocument(WetterTafelSet set)
    {
        ArgumentNullException.ThrowIfNull(set);

        return new WetterTafelSetDocument(set.Id, set.Year,
        [
            .. set.Issues.Select(i => new WetterTafelDocument(
                i.Kennwort,
                i.From.ToString(DateFormat, CultureInfo.InvariantCulture),
                i.Until.ToString(DateFormat, CultureInfo.InvariantCulture),
                [.. i.Columns.Select(c => (IReadOnlyList<string>)[.. c.Settings.Select(s => s.ToString())])]))
        ]);
    }

    public static WetterTafelSet FromDocument(WetterTafelSetDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        if (document.Issues is null || document.Issues.Any(i => i.Columns is null))
            throw new DomainException("A weather table file needs issues with columns.");

        return new WetterTafelSet(document.Id, document.Year, document.Issues.Select(i => new WetterTafel(
            i.Kennwort, Date(i.From), Date(i.Until), i.Columns.Select(SettingList.Parse))));
    }

    public static WetterkurzschluesselDocument Wetterkurzschluessel()
    {
        return new WetterkurzschluesselDocument(
            Domain.KeyProcedure.Wetterkurzschluessel.Order,
            Domain.KeyProcedure.Wetterkurzschluessel.SignatureLetters,
            [
                .. Domain.KeyProcedure.Wetterkurzschluessel.Tables.Select(t => new WetterTabelleDocument(
                    t.Number, t.Title, t.Historical, t.Columns,
                    [.. t.Rows.Select(r => new WetterZeileDocument(r.Heading, r.Cells))]))
            ]);
    }

    private static DateOnly Date(string? value)
    {
        return DateOnly.TryParseExact(value, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None,
            out var date)
            ? date
            : throw new DomainException($"'{value}' is not a date such as 1942-01-20.");
    }
}
