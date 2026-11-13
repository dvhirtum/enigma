using Enigma.Application.KeySheets;
using Enigma.Application.Procedure;
using Enigma.Domain.KeyProcedure;

namespace Enigma.Application.Tests.Procedure;

internal sealed class FakeKenngruppenbuchRepository(params Kenngruppenbuch[] books) : IKenngruppenbuchRepository
{
    public Dictionary<string, Kenngruppenbuch> Books { get; } = books.ToDictionary(b => b.Id);

    public IReadOnlyList<Kenngruppenbuch> List()
    {
        return [.. Books.Values];
    }

    public Kenngruppenbuch? Find(string id)
    {
        return Books.GetValueOrDefault(id);
    }

    public void Save(Kenngruppenbuch book)
    {
        Books[book.Id] = book;
    }
}

internal sealed class FakeTauschtafelSetRepository(params TauschtafelSet[] sets) : ITauschtafelSetRepository
{
    public Dictionary<string, TauschtafelSet> Sets { get; } = sets.ToDictionary(s => s.Id);

    public IReadOnlyList<TauschtafelSet> List()
    {
        return [.. Sets.Values];
    }

    public TauschtafelSet? Find(string id)
    {
        return Sets.GetValueOrDefault(id);
    }

    public void Save(TauschtafelSet tauschtafelSet)
    {
        Sets[tauschtafelSet.Id] = tauschtafelSet;
    }
}

internal sealed class FakeStichwortSetRepository(params StichwortSet[] sets) : IStichwortSetRepository
{
    public Dictionary<string, StichwortSet> Sets { get; } = sets.ToDictionary(s => s.Id);

    public IReadOnlyList<StichwortSet> List()
    {
        return [.. Sets.Values];
    }

    public StichwortSet? Find(string id)
    {
        return Sets.GetValueOrDefault(id);
    }

    public void Save(StichwortSet stichwortSet)
    {
        Sets[stichwortSet.Id] = stichwortSet;
    }
}

internal sealed class FakeWetterTafelSetRepository(params WetterTafelSet[] sets) : IWetterTafelSetRepository
{
    public Dictionary<string, WetterTafelSet> Sets { get; } = sets.ToDictionary(s => s.Id);

    public IReadOnlyList<WetterTafelSet> List()
    {
        return [.. Sets.Values];
    }

    public WetterTafelSet? Find(string id)
    {
        return Sets.GetValueOrDefault(id);
    }

    public void Save(WetterTafelSet wetterTafelSet)
    {
        Sets[wetterTafelSet.Id] = wetterTafelSet;
    }
}

/// <summary>A clock stopped at 1944-06-19 18:40 UTC.</summary>
internal sealed class FixedTimeProvider : TimeProvider
{
    public static DateTimeOffset Now { get; } = new(1944, 6, 19, 18, 40, 0, TimeSpan.Zero);

    public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;

    public override DateTimeOffset GetUtcNow()
    {
        return Now;
    }
}

internal static class Linking
{
    public static KeySheetLinker For(
        IKeySheetRepository sheets,
        IKenngruppenbuchRepository? books = null,
        ITauschtafelSetRepository? tables = null,
        IStichwortSetRepository? stichwoerter = null,
        IWetterTafelSetRepository? wetterTafeln = null)
    {
        return new KeySheetLinker(sheets, books ?? new FakeKenngruppenbuchRepository(),
            tables ?? new FakeTauschtafelSetRepository(),
            stichwoerter ?? new FakeStichwortSetRepository(), wetterTafeln ?? new FakeWetterTafelSetRepository(),
            new Random(1), new FixedTimeProvider());
    }
}
