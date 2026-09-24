using Enigma.Application.KeySheets;
using Enigma.Domain.KeyProcedure;

namespace Enigma.Application.Tests.KeySheets;

internal sealed class FakeKeySheetRepository(params KeySheet[] sheets) : IKeySheetRepository
{
    public Dictionary<string, KeySheet> Sheets { get; } = sheets.ToDictionary(s => s.Id);

    public IReadOnlyList<KeySheet> List() => [.. Sheets.Values];

    public KeySheet? Find(string id) => Sheets.GetValueOrDefault(id);

    public void Save(KeySheet sheet) => Sheets[sheet.Id] = sheet;

    public void Delete(string id) => Sheets.Remove(id);
}
