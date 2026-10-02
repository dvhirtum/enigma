using Enigma.Application.Machine;
using Enigma.Application.Procedure;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.KeySheets;

public sealed class ListKeySheetsHandler(KeySheetLinker linker)
{
    /// <summary>Historical sheets first, then the others; each group by month and network.</summary>
    public IReadOnlyList<KeySheetSummary> Handle(ListKeySheets query)
    {
        return
        [
            .. linker.List()
                .OrderBy(s => s.IsReadOnly ? 0 : 1)
                .ThenBy(s => s.Month.ToString(), StringComparer.Ordinal)
                .ThenBy(s => s.Network, StringComparer.OrdinalIgnoreCase)
                .Select(KeySheetMapper.ToSummary)
        ];
    }
}

public sealed class GetKeySheetHandler(KeySheetLinker linker)
{
    public KeySheetDetails Handle(GetKeySheet query)
    {
        ArgumentNullException.ThrowIfNull(query);

        return KeySheetMapper.ToDetails(linker.Load(query.Id));
    }
}

public sealed class DeleteKeySheetHandler(IKeySheetRepository repository)
{
    public void Handle(DeleteKeySheet command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var sheet = repository.Get(command.Id);
        if (sheet.IsReadOnly)
            throw new DomainException($"Historical key sheet {sheet.Network} {sheet.Month} is read-only.");

        repository.Delete(sheet.Id);
    }
}

public sealed class GenerateKeySheetsHandler(IKeySheetRepository repository, KeySheetLinker linker, Random random)
{
    private readonly Lock gate = new();

    /// <summary>
    ///     Refuses when generated sheets for the model already cover any month of the year. Runs one generation at a
    ///     time.
    /// </summary>
    public IReadOnlyList<KeySheetSummary> Handle(GenerateKeySheets command)
    {
        ArgumentNullException.ThrowIfNull(command);

        lock (gate)
        {
            return Generate(command);
        }
    }

    private List<KeySheetSummary> Generate(GenerateKeySheets command)
    {
        var model = Input.Model(command.Model);
        var months = Enumerable.Range(1, 12).Select(month => new KeyMonth(command.Year, month)).ToList();
        if (repository.List().Any(s =>
                s.Provenance is GeneratedProvenance && s.Model == model && s.Month.Year == command.Year))
            throw new DomainException($"Generated {model.Name} key sheets for {command.Year} already exist.");

        var sheets = Kenngruppenbuch.HistoricalNetworks
            .SelectMany(network =>
                months.Select(month => KeySheetGenerator.Generate(KeySheetIds.New(), model, network, month, random)))
            .ToList();
        foreach (var sheet in sheets)
        {
            linker.Link(sheet);
            repository.Save(sheet);
        }

        return [.. sheets.Select(KeySheetMapper.ToSummary)];
    }
}

public sealed class ImportKeySheetHandler(IKeySheetRepository repository, KeySheetLinker linker)
{
    public KeySheetDetails Handle(ImportKeySheet command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var document = command.Document;
        var book = document.Kenngruppenbuch is { } bookDocument ? ProcedureMapper.FromDocument(bookDocument) : null;
        var set = document.Tauschtafeln is { } setDocument ? ProcedureMapper.FromDocument(setDocument) : null;
        var sheet = KeySheetMapper.FromDocument(
            document with
            {
                KenngruppenbuchId = book?.Id ?? document.KenngruppenbuchId,
                TauschtafelSetId = set?.Id ?? document.TauschtafelSetId
            },
            KeySheetIds.New(),
            Provenance.UserDefined);
        linker.Import(book, set);
        linker.Link(sheet);
        repository.Save(sheet);
        return KeySheetMapper.ToDetails(sheet);
    }
}

public sealed class ExportKeySheetHandler(KeySheetLinker linker)
{
    public KeySheetDocument Handle(ExportKeySheet command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var sheet = linker.Load(command.Id);
        return KeySheetMapper.ToDocument(sheet) with
        {
            Id = null,
            Provenance = null,
            Source = null,
            Kenngruppenbuch = ProcedureMapper.ToDocument(linker.Book(sheet.KenngruppenbuchId!)),
            Tauschtafeln = ProcedureMapper.ToDocument(linker.Tables(sheet.TauschtafelSetId!))
        };
    }
}

public sealed class ApplyDailyKeyHandler(KeySheetLinker linker, IMachineSessionStore store)
{
    public MachineState Handle(ApplyDailyKey command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var sheet = linker.Load(command.SheetId);
        var key = sheet.KeyFor(command.Day);
        var machine = key.SetUp();
        var appliedKey = new AppliedKey(sheet.Id, sheet.Network, sheet.Month.ToString(), key);
        var state = MachineState.From(machine, appliedKey, null, store.Lamps);
        store.Replace(machine, appliedKey);
        return state;
    }
}

internal static class KeySheetIds
{
    public static string New()
    {
        return Guid.NewGuid().ToString("N");
    }

    public static KeySheet Get(this IKeySheetRepository repository, string id)
    {
        return repository.Find(id) ?? throw new KeySheetNotFoundException($"No key sheet has id '{id}'.");
    }
}
