using Enigma.Application.KeySheets;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Procedure;

/// <summary>
///     Links key sheets to a Kenngruppenbuch, a Tauschtafel set, a Stichwort set and weather tables. A sheet keeps a
///     linked book that covers its network; otherwise it gets the newest book, which allots columns to a new network.
///     When no book has free columns, or none exists, a new one is generated. The other three are those for the sheet's
///     year, generated when missing. Days without a Grundstellung get a random one, and a sheet without Offizier or Stab
///     keys gets them. Linking and importing run one at a time, and a stored book is replaced by a changed copy, never
///     changed in place.
/// </summary>
public sealed class KeySheetLinker(
    IKeySheetRepository sheets,
    IKenngruppenbuchRepository books,
    ITauschtafelSetRepository tables,
    IStichwortSetRepository stichwoerter,
    IWetterTafelSetRepository wetterTafeln,
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
            var filled = sheet.FillMissingGrundstellungen(random) | sheet.FillMissingOfficerKeys(random);
            var stichwortSet = StichwortSetFor(sheet);
            var wetterTafelSet = WetterTafelSetFor(sheet);
            if (sheet.StichwortSetId != stichwortSet.Id || sheet.WetterTafelSetId != wetterTafelSet.Id)
            {
                sheet.LinkYearly(stichwortSet.Id, wetterTafelSet.Id);
                filled = true;
            }

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
        foreach (var sheet in all.Where(s => !s.IsLinked || s.HasMissingGrundstellungen || s.HasMissingOfficerKeys))
        {
            Link(sheet);
            sheets.SaveLinks(sheet);
        }

        return all;
    }

    /// <summary>
    ///     Stores the book, Tauschtafel set, Stichwort set and weather tables that came with an imported sheet. A book
    ///     already here gets the allotments it lacks; the others must be the same as those here with the same id. Nothing
    ///     is stored when one conflicts.
    /// </summary>
    public void Import(Kenngruppenbuch? book, TauschtafelSet? set, StichwortSet? stichwortSet = null,
        WetterTafelSet? wetterTafelSet = null)
    {
        lock (_lock)
        {
            var existingSet = set is null ? null : tables.Find(set.Id);
            if (set is not null && existingSet is not null && !existingSet.IsSameAs(set))
                throw new DomainException($"The Tauschtafel set {set.Id} differs from the one with the same id here.");

            var existingStichwortSet = stichwortSet is null ? null : stichwoerter.Find(stichwortSet.Id);
            if (stichwortSet is not null && existingStichwortSet is not null &&
                !existingStichwortSet.IsSameAs(stichwortSet))
                throw new DomainException(
                    $"The Stichwort set {stichwortSet.Id} differs from the one with the same id here.");

            var existingWetterTafelSet = wetterTafelSet is null ? null : wetterTafeln.Find(wetterTafelSet.Id);
            if (wetterTafelSet is not null && existingWetterTafelSet is not null &&
                !existingWetterTafelSet.IsSameAs(wetterTafelSet))
                throw new DomainException(
                    $"The weather tables {wetterTafelSet.Id} differ from the ones with the same id here.");

            if (book is not null)
            {
                var existingBook = books.Find(book.Id);
                if (existingBook is null)
                    books.Save(book);
                else if (Copy(existingBook) is var merged && merged.Merge(book)) books.Save(merged);
            }

            if (set is not null && existingSet is null) tables.Save(set);

            if (stichwortSet is not null && existingStichwortSet is null) stichwoerter.Save(stichwortSet);

            if (wetterTafelSet is not null && existingWetterTafelSet is null) wetterTafeln.Save(wetterTafelSet);
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

    public StichwortSet Stichwoerter(string id)
    {
        return stichwoerter.Find(id) ?? throw new NotFoundException($"No Stichwort set has id '{id}'.");
    }

    public WetterTafelSet WetterTafeln(string id)
    {
        return wetterTafeln.Find(id) ?? throw new NotFoundException($"No weather tables have id '{id}'.");
    }

    private StichwortSet StichwortSetFor(KeySheet sheet)
    {
        var year = sheet.Month.Year;
        var linked = sheet.StichwortSetId is { } id ? stichwoerter.Find(id) : null;
        if (linked is not null && linked.Year == year) return linked;

        var existing = stichwoerter.List().FirstOrDefault(s => s.Year == year);
        if (existing is not null) return existing;

        var set = StichwortSet.Generate(NewId(), year, random);
        stichwoerter.Save(set);
        return set;
    }

    private WetterTafelSet WetterTafelSetFor(KeySheet sheet)
    {
        var year = sheet.Month.Year;
        var linked = sheet.WetterTafelSetId is { } id ? wetterTafeln.Find(id) : null;
        if (linked is not null && linked.Year == year) return linked;

        var existing = wetterTafeln.List().FirstOrDefault(s => s.Year == year);
        if (existing is not null) return existing;

        var set = WetterTafelSet.Generate(NewId(), year, random);
        wetterTafeln.Save(set);
        return set;
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
