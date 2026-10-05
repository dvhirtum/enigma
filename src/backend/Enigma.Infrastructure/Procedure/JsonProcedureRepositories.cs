using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Enigma.Application.Procedure;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Infrastructure.Procedure;

/// <summary>
///     Keeps one JSON file per item in <paramref name="path" />, cached after the first read. Unreadable files are
///     skipped.
/// </summary>
internal sealed class JsonFileStore<TItem, TDocument>(
    string path,
    JsonTypeInfo<TDocument> typeInfo,
    Func<TItem, string> idOf,
    Func<TItem, TDocument> toDocument,
    Func<TDocument, TItem> fromDocument)
    where TItem : class
{
    private readonly Lock _lock = new();
    private Dictionary<string, TItem>? _items;

    public IReadOnlyList<TItem> List()
    {
        lock (_lock)
        {
            return [.. Items().Values];
        }
    }

    public TItem? Find(string id)
    {
        lock (_lock)
        {
            return Items().GetValueOrDefault(id);
        }
    }

    public void Save(TItem item)
    {
        var id = idOf(item);
        if (!IsValidId(id)) throw new DomainException($"'{id}' is not a valid id.");

        lock (_lock)
        {
            Directory.CreateDirectory(path);
            File.WriteAllText(Path.Combine(path, id + ".json"), JsonSerializer.Serialize(toDocument(item), typeInfo));
            Items()[id] = item;
        }
    }

    private Dictionary<string, TItem> Items()
    {
        return _items ??= Load();
    }

    private Dictionary<string, TItem> Load()
    {
        if (!Directory.Exists(path)) return [];

        return Directory.EnumerateFiles(path, "*.json")
            .Where(file => IsValidId(Path.GetFileNameWithoutExtension(file)))
            .Select(Read)
            .OfType<TItem>()
            .ToDictionary(idOf);
    }

    private TItem? Read(string file)
    {
        try
        {
            var document = JsonSerializer.Deserialize(File.ReadAllText(file), typeInfo);
            var item = document is null ? null : fromDocument(document);
            return item is not null && idOf(item) == Path.GetFileNameWithoutExtension(file) ? item : null;
        }
        catch (Exception exception) when (exception is JsonException or DomainException or IOException
                                              or UnauthorizedAccessException)
        {
            return null;
        }
    }

    private static bool IsValidId(string id)
    {
        return !string.IsNullOrEmpty(id) && id.All(c => char.IsAsciiLetterOrDigit(c) || c == '-');
    }
}

/// <summary>Stores Kenngruppenbücher as one JSON file each in <paramref name="path" />.</summary>
public sealed class JsonKenngruppenbuchRepository(string path) : IKenngruppenbuchRepository
{
    private readonly JsonFileStore<Kenngruppenbuch, KenngruppenbuchDocument> _store = new(
        path, ProcedureJsonContext.Default.KenngruppenbuchDocument, b => b.Id, ProcedureMapper.ToDocument,
        ProcedureMapper.FromDocument);

    public IReadOnlyList<Kenngruppenbuch> List()
    {
        return _store.List();
    }

    public Kenngruppenbuch? Find(string id)
    {
        return _store.Find(id);
    }

    public void Save(Kenngruppenbuch book)
    {
        _store.Save(book);
    }
}

/// <summary>Stores Tauschtafel sets as one JSON file each in <paramref name="path" />.</summary>
public sealed class JsonTauschtafelSetRepository(string path) : ITauschtafelSetRepository
{
    private readonly JsonFileStore<TauschtafelSet, TauschtafelSetDocument> _store = new(
        path, ProcedureJsonContext.Default.TauschtafelSetDocument, s => s.Id, ProcedureMapper.ToDocument,
        ProcedureMapper.FromDocument);

    public IReadOnlyList<TauschtafelSet> List()
    {
        return _store.List();
    }

    public TauschtafelSet? Find(string id)
    {
        return _store.Find(id);
    }

    public void Save(TauschtafelSet tauschtafelSet)
    {
        _store.Save(tauschtafelSet);
    }
}

/// <summary>Stores Stichwort sets as one JSON file each in <paramref name="path" />.</summary>
public sealed class JsonStichwortSetRepository(string path) : IStichwortSetRepository
{
    private readonly JsonFileStore<StichwortSet, StichwortSetDocument> _store = new(
        path, ProcedureJsonContext.Default.StichwortSetDocument, s => s.Id, YearlyProcedureMapper.ToDocument,
        YearlyProcedureMapper.FromDocument);

    public IReadOnlyList<StichwortSet> List()
    {
        return _store.List();
    }

    public StichwortSet? Find(string id)
    {
        return _store.Find(id);
    }

    public void Save(StichwortSet stichwortSet)
    {
        _store.Save(stichwortSet);
    }
}

/// <summary>Stores weather short-signal tables as one JSON file each in <paramref name="path" />.</summary>
public sealed class JsonWetterTafelSetRepository(string path) : IWetterTafelSetRepository
{
    private readonly JsonFileStore<WetterTafelSet, WetterTafelSetDocument> _store = new(
        path, ProcedureJsonContext.Default.WetterTafelSetDocument, s => s.Id, YearlyProcedureMapper.ToDocument,
        YearlyProcedureMapper.FromDocument);

    public IReadOnlyList<WetterTafelSet> List()
    {
        return _store.List();
    }

    public WetterTafelSet? Find(string id)
    {
        return _store.Find(id);
    }

    public void Save(WetterTafelSet wetterTafelSet)
    {
        _store.Save(wetterTafelSet);
    }
}

[JsonSourceGenerationOptions(JsonSerializerDefaults.Web)]
[JsonSerializable(typeof(KenngruppenbuchDocument))]
[JsonSerializable(typeof(TauschtafelSetDocument))]
[JsonSerializable(typeof(StichwortSetDocument))]
[JsonSerializable(typeof(WetterTafelSetDocument))]
internal sealed partial class ProcedureJsonContext : JsonSerializerContext;
