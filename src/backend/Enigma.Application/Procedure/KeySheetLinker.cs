using Enigma.Application.KeySheets;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Procedure;

/// <summary>
///     Links key sheets to a Kenngruppenbuch and a Tauschtafel set. A sheet keeps a linked book that covers its network;
///     otherwise it gets the newest book, which allots columns to a new network. When no book has free columns, or none
///     exists, a new one is generated. The Tauschtafel set is the one for the sheet's year, generated when missing.
///     Days without a Grundstellung get a random one. Linking and importing run one at a time, and a stored book is
///     replaced by a changed copy, never changed in place.
/// </summary>
public sealed class KeySheetLinker(
    IKeySheetRepository sheets,
    IKenngruppenbuchRepository books,
    ITauschtafelSetRepository tables,
    Random random,
    TimeProvider time)
{
    private readonly Lock _lock = new();

    /// <summary>
    ///     Links <paramref name="sheet" /> and fills missing Grundstellungen, without saving it. Returns true when it changed.
    /// </summary>
    public bool Link(KeySheet sheet)
    {
        ArgumentNullException.ThrowIfNull(sheet);

        lock (_lock)
        {
            var filled = sheet.FillMissingGrundstellungen(random);
            var book = BookFor(sheet);
            var set = SetFor(sheet);
            if (sheet.KenngruppenbuchId == book.Id && sheet.TauschtafelSetId == set.Id) return filled;

            sheet.Link(book.Id, set.Id);
            return true;
        }
    }

    /// <summary>Loads a sheet, linking and completing it (and storing that) first if needed.</summary>
    public KeySheet Load(string id)
    {
        var sheet = sheets.Get(id);
        if (Link(sheet)) sheets.SaveLinks(sheet);

        return sheet;
    }

    /// <summary>Lists all sheets, linking and completing those without links or Grundstellungen.</summary>
    public IReadOnlyList<KeySheet> List()
    {
        var all = sheets.List();
        foreach (var sheet in all.Where(s => !s.IsLinked || s.HasMissingGrundstellungen))
        {
            Link(sheet);
            sheets.SaveLinks(sheet);
        }

        return all;
    }

    /// <summary>
    ///     Stores a book and a table set that came with an imported sheet. A book already here gets the allotments it
    ///     lacks; a table set already here must be the same. Nothing is stored when either conflicts.
    /// </summary>
    public void Import(Kenngruppenbuch? book, TauschtafelSet? set)
    {
        lock (_lock)
        {
            var existingSet = set is null ? null : tables.Find(set.Id);
            if (set is not null && existingSet is not null && !existingSet.IsSameAs(set))
                throw new DomainException($"The Tauschtafel set {set.Id} differs from the one with the same id here.");

            if (book is not null)
            {
                var existingBook = books.Find(book.Id);
                if (existingBook is null)
                    books.Save(book);
                else if (Copy(existingBook) is var merged && merged.Merge(book)) books.Save(merged);
            }

            if (set is not null && existingSet is null) tables.Save(set);
        }
    }

    public Kenngruppenbuch Book(string id)
    {
        return books.Find(id) ?? throw new NotFoundException($"No Kenngruppenbuch has id '{id}'.");
    }

    public TauschtafelSet Tables(string id)
    {
        return tables.Find(id) ?? throw new NotFoundException($"No Tauschtafel set has id '{id}'.");
    }

    private Kenngruppenbuch BookFor(KeySheet sheet)
    {
        var linked = sheet.KenngruppenbuchId is { } id ? books.Find(id) : null;
        if (linked is not null && linked.Covers(sheet.Network)) return linked;

        var newest = books.List().MaxBy(b => b.Created);
        if (newest is not null && newest.Covers(sheet.Network)) return newest;

        if (newest is { HasFreeColumns: true })
        {
            var allotted = Copy(newest);
            allotted.Allot(sheet.Network);
            books.Save(allotted);
            return allotted;
        }

        var book = Kenngruppenbuch.Generate(NewId(), time.GetUtcNow(),
            [.. Kenngruppenbuch.HistoricalNetworks, sheet.Network], random);
        books.Save(book);
        return book;
    }

    private TauschtafelSet SetFor(KeySheet sheet)
    {
        var year = sheet.Month.Year;
        var linked = sheet.TauschtafelSetId is { } id ? tables.Find(id) : null;
        if (linked is not null && linked.Year == year) return linked;

        var existing = tables.List().FirstOrDefault(s => s.Year == year);
        if (existing is not null) return existing;

        var set = TauschtafelSet.Generate(NewId(), year, random);
        tables.Save(set);
        return set;
    }

    private static Kenngruppenbuch Copy(Kenngruppenbuch book)
    {
        return ProcedureMapper.FromDocument(ProcedureMapper.ToDocument(book));
    }

    private static string NewId()
    {
        return Guid.NewGuid().ToString("N");
    }
}
