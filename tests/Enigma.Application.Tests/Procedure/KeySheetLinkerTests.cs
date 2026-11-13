using Enigma.Application.Procedure;
using Enigma.Application.Tests.KeySheets;
using Enigma.Domain.KeyProcedure;

namespace Enigma.Application.Tests.Procedure;

public sealed class KeySheetLinkerTests
{
    private static KeySheet Sheet(string id, string network, string month = "1944-06", Provenance? provenance = null)
    {
        return new KeySheet(id, network, KeyMonth.Parse(month), provenance ?? Provenance.Generated,
            KeySheetText.Parse("1 B I II III 01 01 01 AT QRS\n"));
    }

    private static Kenngruppenbuch Book(string id, DateTimeOffset created, params string[] networks)
    {
        return Kenngruppenbuch.Generate(id, created, networks, new Random(3));
    }

    [Fact]
    public void Should_generate_a_book_with_the_historical_nets_and_a_set_for_the_year_When_none_exist()
    {
        // Arrange
        var books = new FakeKenngruppenbuchRepository();
        var tables = new FakeTauschtafelSetRepository();
        var linker = Linking.For(new FakeKeySheetRepository(), books, tables);
        var sheet = Sheet("s", "Seehund");

        // Act
        var changed = linker.Link(sheet);

        // Assert
        Assert.True(changed);
        var book = Assert.Single(books.Books.Values);
        Assert.Equal([.. Kenngruppenbuch.HistoricalNetworks, "Seehund"], book.Allotments.Select(a => a.Network));
        var set = Assert.Single(tables.Sets.Values);
        Assert.Equal(1944, set.Year);
        Assert.Equal((book.Id, set.Id), (sheet.KenngruppenbuchId, sheet.TauschtafelSetId));
    }

    [Fact]
    public void Should_link_the_newest_book_and_allot_columns_When_the_network_is_new()
    {
        // Arrange
        var older = Book("older", new DateTimeOffset(1943, 1, 1, 0, 0, 0, TimeSpan.Zero), "Triton");
        var newer = Book("newer", new DateTimeOffset(1944, 1, 1, 0, 0, 0, TimeSpan.Zero), "Triton");
        var books = new FakeKenngruppenbuchRepository(older, newer);
        var linker = Linking.For(new FakeKeySheetRepository(), books);
        var sheet = Sheet("s", "Seehund");

        // Act
        linker.Link(sheet);

        // Assert
        Assert.Equal("newer", sheet.KenngruppenbuchId);
        Assert.True(books.Books["newer"].Covers("Seehund"));
        Assert.False(books.Books["older"].Covers("Seehund"));
    }

    [Fact]
    public void Should_leave_a_book_handed_out_earlier_unchanged_When_a_new_network_gets_columns()
    {
        // Arrange
        var books = new FakeKenngruppenbuchRepository(Book("b", new DateTimeOffset(1944, 1, 1, 0, 0, 0, TimeSpan.Zero),
            "Triton"));
        var linker = Linking.For(new FakeKeySheetRepository(), books);
        var handedOut = linker.Book("b");

        // Act
        linker.Link(Sheet("s", "Seehund"));

        // Assert
        Assert.False(handedOut.Covers("Seehund"));
        Assert.True(linker.Book("b").Covers("Seehund"));
    }

    [Fact]
    public void Should_generate_a_new_book_When_the_newest_has_no_free_columns()
    {
        // Arrange
        var full = Book("full", new DateTimeOffset(1944, 1, 1, 0, 0, 0, TimeSpan.Zero),
            [.. Enumerable.Range(1, 28).Select(n => $"Net {n}")]);
        var books = new FakeKenngruppenbuchRepository(full);
        var linker = Linking.For(new FakeKeySheetRepository(), books);
        var sheet = Sheet("s", "Seehund");

        // Act
        linker.Link(sheet);

        // Assert
        Assert.NotEqual("full", sheet.KenngruppenbuchId);
        Assert.True(books.Books[sheet.KenngruppenbuchId!].Covers("Seehund"));
        Assert.True(books.Books[sheet.KenngruppenbuchId!].Covers("Triton"));
    }

    [Fact]
    public void Should_keep_the_links_When_the_linked_book_and_set_still_fit()
    {
        // Arrange
        var book = Book("book", new DateTimeOffset(1943, 1, 1, 0, 0, 0, TimeSpan.Zero), "Triton");
        var newer = Book("newer", new DateTimeOffset(1944, 1, 1, 0, 0, 0, TimeSpan.Zero), "Triton");
        var set = TauschtafelSet.Generate("set", 1944, new Random(4));
        var stichwoerter = StichwortSet.Generate("stichwoerter", 1944, new Random(4));
        var wetterTafeln = WetterTafelSet.Generate("wetter", 1944, new Random(4));
        var linker = Linking.For(new FakeKeySheetRepository(), new FakeKenngruppenbuchRepository(book, newer),
            new FakeTauschtafelSetRepository(set), new FakeStichwortSetRepository(stichwoerter),
            new FakeWetterTafelSetRepository(wetterTafeln));
        var sheet = Sheet("s", "Triton");
        sheet.Link("book", "set");
        sheet.LinkYearly("stichwoerter", "wetter");
        sheet.FillMissingOfficerKeys(new Random(5));

        // Act
        var changed = linker.Link(sheet);

        // Assert
        Assert.False(changed);
        Assert.Equal("book", sheet.KenngruppenbuchId);
    }

    [Fact]
    public void Should_link_the_set_of_the_new_year_When_the_month_moves_to_another_year()
    {
        // Arrange
        var set1944 = TauschtafelSet.Generate("set-1944", 1944, new Random(4));
        var tables = new FakeTauschtafelSetRepository(set1944);
        var linker = Linking.For(new FakeKeySheetRepository(), tables: tables);
        var sheet = Sheet("s", "Triton", "1945-01");
        sheet.Link("book", "set-1944");

        // Act
        linker.Link(sheet);

        // Assert
        Assert.Equal(1945, tables.Sets[sheet.TauschtafelSetId!].Year);
    }

    [Fact]
    public void Should_store_the_links_When_an_unlinked_sheet_is_loaded()
    {
        // Arrange
        var sheets = new FakeKeySheetRepository(Sheet("h", "Hydra", provenance: Provenance.Historical("source")));
        var linker = Linking.For(sheets);

        // Act
        var sheet = linker.Load("h");

        // Assert
        Assert.True(sheet.IsLinked);
        Assert.True(sheets.Sheets["h"].IsLinked);
    }

    [Fact]
    public void Should_fill_and_store_the_Grundstellungen_When_a_sheet_without_them_is_loaded()
    {
        // Arrange
        var sheets = new FakeKeySheetRepository(
            new KeySheet("old", "Triton", KeyMonth.Parse("1944-06"), Provenance.Generated,
                KeySheetText.Parse("1 B I II III 01 01 01 AT\n")));
        var linker = Linking.For(sheets);

        // Act
        var sheet = linker.Load("old");

        // Assert
        Assert.Equal(3, sheet.KeyFor(1).Grundstellung!.Count);
        Assert.False(sheets.Sheets["old"].HasMissingGrundstellungen);
    }

    [Fact]
    public void Should_throw_not_found_When_a_book_does_not_exist()
    {
        // Arrange
        var handler = new GetKenngruppenbuchHandler(Linking.For(new FakeKeySheetRepository()));

        // Act
        void Act()
        {
            handler.Handle(new GetKenngruppenbuch("missing"));
        }

        // Assert
        Assert.Throws<NotFoundException>(Act);
    }

    [Fact]
    public void Should_write_each_column_as_26_trigrams_When_a_book_is_mapped()
    {
        // Arrange
        var book = Book("book", new DateTimeOffset(1944, 1, 1, 0, 0, 0, TimeSpan.Zero), "Triton");

        // Act
        var document = ProcedureMapper.ToDocument(book);
        var back = ProcedureMapper.FromDocument(document);

        // Assert
        Assert.Equal(676, document.Columns.Count);
        Assert.Equal(string.Join(' ', book.Column(1)), document.Columns[0]);
        Assert.Equal(new AllotmentDocument("Triton", 101, 120), Assert.Single(document.Allotments));
        Assert.Equal(book.Column(676), back.Column(676));
    }

    [Fact]
    public void Should_share_one_Stichwort_set_and_one_weather_table_set_When_two_sheets_of_a_year_are_linked()
    {
        // Arrange
        var stichwoerter = new FakeStichwortSetRepository();
        var wetterTafeln = new FakeWetterTafelSetRepository();
        var linker = Linking.For(new FakeKeySheetRepository(), stichwoerter: stichwoerter, wetterTafeln: wetterTafeln);
        var triton = Sheet("t", "Triton");
        var hydra = Sheet("h", "Hydra", "1944-11");

        // Act
        linker.Link(triton);
        linker.Link(hydra);

        // Assert
        Assert.Equal(1944, Assert.Single(stichwoerter.Sets.Values).Year);
        Assert.Equal(1944, Assert.Single(wetterTafeln.Sets.Values).Year);
        Assert.Equal((triton.StichwortSetId, triton.WetterTafelSetId), (hydra.StichwortSetId, hydra.WetterTafelSetId));
        Assert.NotNull(triton.Offizier);
        Assert.NotNull(hydra.Stab);
    }
}
