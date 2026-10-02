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
        ITauschtafelSetRepository? tables = null)
    {
        return new KeySheetLinker(sheets, books ?? new FakeKenngruppenbuchRepository(),
            tables ?? new FakeTauschtafelSetRepository(),
            new Random(1), new FixedTimeProvider());
    }
}
