using System.Text.Json;
using System.Text.Json.Serialization;
using Enigma.Application.KeySheets;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Infrastructure.KeySheets;

/// <summary>
/// Reads historical sheets from <paramref name="historicalPath"/> (read-only) and keeps generated and user-defined
/// sheets as one JSON file each in <paramref name="userPath"/>. Unreadable user files are skipped.
/// </summary>
public sealed class JsonKeySheetRepository(string historicalPath, string userPath) : IKeySheetRepository
{
    private readonly Lock _lock = new();
    private IReadOnlyList<KeySheet>? _historical;

    public IReadOnlyList<KeySheet> List()
    {
        lock (_lock)
        {
            return [.. Historical(), .. UserSheets()];
        }
    }

    public KeySheet? Find(string id)
    {
        lock (_lock)
        {
            return Historical().FirstOrDefault(s => s.Id == id)
                ?? (IsValidId(id) && File.Exists(UserFile(id)) ? Read(UserFile(id)) : null);
        }
    }

    public void Save(KeySheet sheet)
    {
        ArgumentNullException.ThrowIfNull(sheet);

        lock (_lock)
        {
            if (sheet.IsReadOnly || Historical().Any(s => s.Id == sheet.Id) || !IsValidId(sheet.Id))
            {
                throw new DomainException($"Key sheet {sheet.Network} {sheet.Month} cannot be saved.");
            }

            Directory.CreateDirectory(userPath);
            var json = JsonSerializer.Serialize(KeySheetMapper.ToDocument(sheet), KeySheetJsonContext.Default.KeySheetDocument);
            File.WriteAllText(UserFile(sheet.Id), json);
        }
    }

    public void SaveLinks(KeySheet sheet)
    {
        ArgumentNullException.ThrowIfNull(sheet);

        lock (_lock)
        {
            if (!sheet.IsReadOnly)
            {
                Save(sheet);
                return;
            }

            var links = ReadHistoricalLinks();
            var link = new SheetLinks(
                sheet.KenngruppenbuchId,
                sheet.TauschtafelSetId,
                sheet.DailyKeys.Where(k => k.Grundstellung is not null).ToDictionary(k => k.Day, k => k.Grundstellung!.ToString()));
            links[sheet.Id] = link;
            Directory.CreateDirectory(Path.GetDirectoryName(HistoricalLinksFile)!);
            File.WriteAllText(HistoricalLinksFile, JsonSerializer.Serialize(links, KeySheetJsonContext.Default.DictionaryStringSheetLinks));
            var cached = Historical().FirstOrDefault(s => s.Id == sheet.Id);
            if (cached is not null && cached != sheet)
            {
                Apply(link, cached);
            }
        }
    }

    public void Delete(string id)
    {
        lock (_lock)
        {
            if (IsValidId(id))
            {
                File.Delete(UserFile(id));
            }
        }
    }

    private IReadOnlyList<KeySheet> Historical() => _historical ??= LoadHistorical();

    private IReadOnlyList<KeySheet> LoadHistorical()
    {
        if (!Directory.Exists(historicalPath))
        {
            return [];
        }

        var links = ReadHistoricalLinks();
        return
        [
            .. Directory.EnumerateFiles(historicalPath, "*.json")
                .Order(StringComparer.Ordinal)
                .Select(file =>
                {
                    var document = Deserialize(file)
                        ?? throw new InvalidDataException($"Historical key sheet {file} is empty.");
                    var sheet = KeySheetMapper.FromDocument(
                        document,
                        "historical-" + Path.GetFileNameWithoutExtension(file),
                        Provenance.Historical(document.Source ?? string.Empty));
                    if (links.TryGetValue(sheet.Id, out var link))
                    {
                        Apply(link, sheet);
                    }

                    return sheet;
                }),
        ];
    }

    /// <summary>Applies the stored links and Grundstellungen to a historical sheet. Entries that no longer fit are skipped.</summary>
    private static void Apply(SheetLinks link, KeySheet sheet)
    {
        if (link is { KenngruppenbuchId: { } book, TauschtafelSetId: { } tables })
        {
            sheet.Link(book, tables);
        }

        foreach (var (day, grundstellung) in link.Grundstellungen ?? [])
        {
            try
            {
                sheet.SetGrundstellung(day, RotorPositions.Parse(grundstellung));
            }
            catch (DomainException)
            {
                // The stored Grundstellung does not fit the day; the linker fills a new one.
            }
        }
    }

    private string HistoricalLinksFile => Path.Combine(userPath, "procedure", "historical-links.json");

    /// <summary>The links of historical sheets by sheet id. An unreadable file counts as empty.</summary>
    private Dictionary<string, SheetLinks> ReadHistoricalLinks()
    {
        try
        {
            return File.Exists(HistoricalLinksFile)
                ? JsonSerializer.Deserialize(File.ReadAllText(HistoricalLinksFile), KeySheetJsonContext.Default.DictionaryStringSheetLinks) ?? []
                : [];
        }
        catch (Exception exception) when (exception is JsonException or IOException or UnauthorizedAccessException)
        {
            return [];
        }
    }

    private IEnumerable<KeySheet> UserSheets()
    {
        if (!Directory.Exists(userPath))
        {
            return [];
        }

        return Directory.EnumerateFiles(userPath, "*.json")
            .Where(file => IsValidId(Path.GetFileNameWithoutExtension(file)))
            .Select(Read)
            .OfType<KeySheet>();
    }

    private static KeySheet? Read(string file)
    {
        try
        {
            var document = Deserialize(file);
            if (document is null)
            {
                return null;
            }

            var provenance = KeySheetMapper.ProvenanceOf(document);
            return provenance is HistoricalProvenance
                ? null
                : KeySheetMapper.FromDocument(document, Path.GetFileNameWithoutExtension(file), provenance);
        }
        catch (Exception exception) when (exception is JsonException or DomainException or IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    private static KeySheetDocument? Deserialize(string file) =>
        JsonSerializer.Deserialize(File.ReadAllText(file), KeySheetJsonContext.Default.KeySheetDocument);

    private string UserFile(string id) => Path.Combine(userPath, id + ".json");

    /// <summary>User sheet ids are file names: letters, digits and hyphens only.</summary>
    private static bool IsValidId(string id) =>
        !string.IsNullOrEmpty(id) && id.All(c => char.IsAsciiLetterOrDigit(c) || c == '-');
}

/// <summary>The Kenngruppenbuch, Tauschtafel set and filled-in Grundstellungen (by day) of a historical sheet.</summary>
internal sealed record SheetLinks(string? KenngruppenbuchId, string? TauschtafelSetId, Dictionary<int, string>? Grundstellungen = null);

[JsonSourceGenerationOptions(JsonSerializerDefaults.Web, WriteIndented = true)]
[JsonSerializable(typeof(KeySheetDocument))]
[JsonSerializable(typeof(Dictionary<string, SheetLinks>))]
internal sealed partial class KeySheetJsonContext : JsonSerializerContext;
