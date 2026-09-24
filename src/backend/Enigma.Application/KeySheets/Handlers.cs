using Enigma.Application.Machine;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.KeySheets;

public sealed class ListKeySheetsHandler(IKeySheetRepository repository)
{
    /// <summary>Historical sheets first, then the others; each group by month and network.</summary>
    public IReadOnlyList<KeySheetSummary> Handle(ListKeySheets query) =>
    [
        .. repository.List()
            .OrderBy(s => s.IsReadOnly ? 0 : 1)
            .ThenBy(s => s.Month.ToString(), StringComparer.Ordinal)
            .ThenBy(s => s.Network, StringComparer.OrdinalIgnoreCase)
            .Select(KeySheetMapper.ToSummary),
    ];
}

public sealed class GetKeySheetHandler(IKeySheetRepository repository)
{
    public KeySheetDetails Handle(GetKeySheet query)
    {
        ArgumentNullException.ThrowIfNull(query);

        return KeySheetMapper.ToDetails(repository.Get(query.Id));
    }
}

public sealed class CreateKeySheetHandler(IKeySheetRepository repository)
{
    public KeySheetDetails Handle(CreateKeySheet command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var sheet = new KeySheet(
            KeySheetIds.New(), command.Network, KeyMonth.Parse(command.Month ?? string.Empty), Provenance.UserDefined,
            KeySheetText.Parse(command.Text ?? string.Empty));
        repository.Save(sheet);
        return KeySheetMapper.ToDetails(sheet);
    }
}

public sealed class UpdateKeySheetHandler(IKeySheetRepository repository)
{
    public KeySheetDetails Handle(UpdateKeySheet command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var sheet = repository.Get(command.Id);
        sheet.Update(command.Network, KeyMonth.Parse(command.Month ?? string.Empty), KeySheetText.Parse(command.Text ?? string.Empty));
        repository.Save(sheet);
        return KeySheetMapper.ToDetails(sheet);
    }
}

public sealed class DeleteKeySheetHandler(IKeySheetRepository repository)
{
    public void Handle(DeleteKeySheet command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var sheet = repository.Get(command.Id);
        if (sheet.IsReadOnly)
        {
            throw new DomainException($"Historical key sheet {sheet.Network} {sheet.Month} is read-only.");
        }

        repository.Delete(sheet.Id);
    }
}

public sealed class GenerateKeySheetHandler(IKeySheetRepository repository, Random random)
{
    public KeySheetDetails Handle(GenerateKeySheet command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var sheet = KeySheetGenerator.Generate(
            KeySheetIds.New(), Input.Model(command.Model), command.Network, KeyMonth.Parse(command.Month ?? string.Empty), random);
        repository.Save(sheet);
        return KeySheetMapper.ToDetails(sheet);
    }
}

public sealed class ImportKeySheetHandler(IKeySheetRepository repository)
{
    public KeySheetDetails Handle(ImportKeySheet command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var sheet = KeySheetMapper.FromDocument(command.Document, KeySheetIds.New(), Provenance.UserDefined);
        repository.Save(sheet);
        return KeySheetMapper.ToDetails(sheet);
    }
}

public sealed class ApplyDailyKeyHandler(IKeySheetRepository repository, IMachineSessionStore store)
{
    public MachineState Handle(ApplyDailyKey command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var machine = repository.Get(command.SheetId).KeyFor(command.Day).SetUp();
        var state = MachineState.From(machine);
        store.Replace(machine);
        return state;
    }
}

internal static class KeySheetIds
{
    public static string New() => Guid.NewGuid().ToString("N");

    public static KeySheet Get(this IKeySheetRepository repository, string id) =>
        repository.Find(id) ?? throw new KeySheetNotFoundException($"No key sheet has id '{id}'.");
}
