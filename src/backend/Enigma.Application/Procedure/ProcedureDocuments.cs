using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Procedure;

/// <summary>Columns <see cref="First"/> to <see cref="Last"/>, numbered from 1.</summary>
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

/// <summary>A Tauschtafel set as stored and shown. <see cref="Calendar"/> gives the table for each half month.</summary>
public sealed record TauschtafelSetDocument(string Id, int Year, IReadOnlyList<TauschtafelDocument> Tables, IReadOnlyList<int> Calendar);

public static class ProcedureMapper
{
    public static KenngruppenbuchDocument ToDocument(Kenngruppenbuch book)
    {
        ArgumentNullException.ThrowIfNull(book);

        return new KenngruppenbuchDocument(
            book.Id,
            book.Created,
            new ColumnRangeDocument(Kenngruppenbuch.Verfahrenkenngruppen.First, Kenngruppenbuch.Verfahrenkenngruppen.Last),
            [.. book.Allotments.Select(a => new AllotmentDocument(a.Network, a.Columns.First, a.Columns.Last))],
            [.. Enumerable.Range(1, Kenngruppenbuch.ColumnCount).Select(n => string.Join(' ', book.Column(n)))]);
    }

    /// <summary>Builds a book from a document. Bad data throws <see cref="DomainException"/>.</summary>
    public static Kenngruppenbuch FromDocument(KenngruppenbuchDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        if (document.Columns is null || document.Allotments is null)
        {
            throw new DomainException("A Kenngruppenbuch file needs columns and allotments.");
        }

        return new Kenngruppenbuch(
            document.Id,
            document.Created,
            [.. document.Columns.Select(c => (IReadOnlyList<Kenngruppe>)[.. c.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(Kenngruppe.Parse)])],
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

        if (document.Tables is null || document.Calendar is null)
        {
            throw new DomainException("A Tauschtafel file needs tables and a calendar.");
        }

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
