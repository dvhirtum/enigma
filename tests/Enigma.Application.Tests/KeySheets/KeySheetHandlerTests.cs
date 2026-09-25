using Enigma.Application.KeySheets;
using Enigma.Application.Machine;
using Enigma.Application.Procedure;
using Enigma.Application.Tests.Procedure;
using Enigma.Application.Tests.Machine;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.KeySheets;

public sealed class KeySheetHandlerTests
{
    private const string M3Row = "1 B I II III 01 01 01 AT\n";
    private const string M4Row = "1 B-thin Beta II IV I 01 01 01 22 AT BL DF GJ HM NW OP QY RZ VX QRSA\n";

    private static KeySheet Sheet(string id, string network, string month, Provenance provenance, string text = M3Row) =>
        new(id, network, KeyMonth.Parse(month), provenance, KeySheetText.Parse(text));

    [Fact]
    public void Should_reject_the_change_When_a_historical_sheet_is_deleted()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("h", "Hydra", "1944-06", Provenance.Historical("source")));
        var handler = new DeleteKeySheetHandler(repository);

        // Act
        void Act() => handler.Handle(new DeleteKeySheet("h"));

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Contains("h", repository.Sheets.Keys);
    }

    [Fact]
    public void Should_remove_the_sheet_When_a_user_defined_sheet_is_deleted()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("u", "Hydra", "1944-06", Provenance.UserDefined));
        var handler = new DeleteKeySheetHandler(repository);

        // Act
        handler.Handle(new DeleteKeySheet("u"));

        // Assert
        Assert.Empty(repository.Sheets);
    }

    [Fact]
    public void Should_throw_not_found_When_the_sheet_does_not_exist()
    {
        // Arrange
        var handler = new GetKeySheetHandler(Linking.For(new FakeKeySheetRepository()));

        // Act
        void Act() => handler.Handle(new GetKeySheet("missing"));

        // Assert
        Assert.Throws<KeySheetNotFoundException>(Act);
    }

    [Fact]
    public void Should_list_historical_sheets_first_then_by_month_When_sheets_are_listed()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(
            Sheet("b", "Triton", "1944-07", Provenance.Generated),
            Sheet("a", "Hydra", "1944-06", Provenance.UserDefined),
            Sheet("h", "Hydra", "1945-04", Provenance.Historical("source")));
        var handler = new ListKeySheetsHandler(Linking.For(repository));

        // Act
        var sheets = handler.Handle(new ListKeySheets());

        // Assert
        Assert.Equal(["h", "a", "b"], sheets.Select(s => s.Id));
        Assert.True(sheets[0].ReadOnly);
        Assert.Equal("source", sheets[0].Source);
    }

    [Fact]
    public void Should_store_every_month_for_every_network_When_a_year_is_generated()
    {
        // Arrange
        var repository = new FakeKeySheetRepository();
        var handler = new GenerateKeySheetsHandler(repository, Linking.For(repository), new Random(1));

        // Act
        var sheets = handler.Handle(new GenerateKeySheets("M4", 1944));

        // Assert
        Assert.Equal(120, sheets.Count);
        Assert.All(sheets, s => Assert.Equal(("M4", "Generated"), (s.Model, s.Provenance)));
        Assert.Equal(Kenngruppenbuch.HistoricalNetworks, sheets.Select(s => s.Network).Distinct());
        Assert.Equal(Enumerable.Range(1, 12).Select(m => $"1944-{m:00}"), sheets.Where(s => s.Network == "Aegir").Select(s => s.Month));
        Assert.Equal(29, repository.Sheets[sheets[1].Id].DailyKeys.Count);
        Assert.Single(repository.Sheets.Values.Select(s => s.KenngruppenbuchId).Distinct());
    }

    [Fact]
    public void Should_refuse_When_generated_sheets_for_the_year_and_model_exist()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("g", "Triton", "1944-06", Provenance.Generated));
        var handler = new GenerateKeySheetsHandler(repository, Linking.For(repository), new Random(1));

        // Act
        void Act() => handler.Handle(new GenerateKeySheets("M3", 1944));

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("Generated M3 key sheets for 1944 already exist.", exception.Message);
        Assert.Single(repository.Sheets);
    }

    [Fact]
    public async Task Should_generate_the_year_once_When_two_requests_run_at_the_same_time()
    {
        // Arrange
        var repository = new FakeKeySheetRepository();
        var handler = new GenerateKeySheetsHandler(repository, Linking.For(repository), new Random(1));
        using var start = new Barrier(2);

        // Act
        var exceptions = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ => Task.Run(() =>
        {
            start.SignalAndWait();
            return Record.Exception(() => handler.Handle(new GenerateKeySheets("M4", 1944)));
        })));

        // Assert
        Assert.Single(exceptions, e => e is DomainException);
        Assert.Single(exceptions, e => e is null);
        Assert.Equal(120, repository.Sheets.Count);
    }

    [Theory]
    [InlineData("M4", 1944, "Generated")]
    [InlineData("M3", 1945, "Generated")]
    [InlineData("M3", 1944, "UserDefined")]
    public void Should_generate_When_the_existing_sheet_has_another_model_year_or_provenance(string model, int year, string provenance)
    {
        // Arrange
        var existing = Sheet("x", "Triton", "1944-06", provenance == "Generated" ? Provenance.Generated : Provenance.UserDefined);
        var repository = new FakeKeySheetRepository(existing);
        var handler = new GenerateKeySheetsHandler(repository, Linking.For(repository), new Random(1));

        // Act
        var sheets = handler.Handle(new GenerateKeySheets(model, year));

        // Assert
        Assert.Equal(120, sheets.Count);
    }

    [Fact]
    public void Should_store_the_sheet_as_user_defined_When_a_file_is_imported()
    {
        // Arrange
        var repository = new FakeKeySheetRepository();
        var handler = new ImportKeySheetHandler(repository, Linking.For(repository));
        var document = new KeySheetDocument(
            "historical-x", "Hydra", "1943-12", "Historical", "made up",
            [new DailyKeyDocument(26, "B", ["III", "VI", "VIII"], [1, 8, 13], ["AN", "EZ"], null)]);

        // Act
        var details = handler.Handle(new ImportKeySheet(document));

        // Assert
        Assert.NotEqual("historical-x", details.Id);
        Assert.Equal("UserDefined", details.Provenance);
        Assert.Null(details.Source);
        Assert.Matches("^[A-Z]{3}$", Assert.Single(details.Days).Grundstellung);
    }

    [Fact]
    public void Should_name_the_day_When_an_imported_day_is_invalid()
    {
        // Arrange
        var handler = new ImportKeySheetHandler(new FakeKeySheetRepository(), Linking.For(new FakeKeySheetRepository()));
        var document = new KeySheetDocument(
            null, "Hydra", "1943-12", null, null,
            [new DailyKeyDocument(26, "B", ["III", "VI", "IX"], [1, 8, 13], [], null)]);

        // Act
        void Act() => handler.Handle(new ImportKeySheet(document));

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("Day 26: Unknown rotor 'IX'.", exception.Message);
    }

    [Fact]
    public void Should_replace_the_machine_with_the_daily_key_When_a_key_of_another_model_is_applied()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("t", "Triton", "1942-11", Provenance.UserDefined, "19" + M4Row[1..]));
        var store = new FakeMachineSessionStore();
        var handler = new ApplyDailyKeyHandler(Linking.For(repository), store);

        // Act
        var state = handler.Handle(new ApplyDailyKey("t", 19));

        // Assert
        Assert.Equal(MachineModel.M4, store.Machine.Model);
        Assert.Equal("B-thin", state.Reflector);
        Assert.Equal(["Beta", "II", "IV", "I"], state.Rotors.Select(r => r.Rotor));
        Assert.Equal([1, 1, 1, 22], state.Rotors.Select(r => r.RingSetting));
        Assert.All(state.Rotors, r => Assert.Equal("A", r.Position));
        Assert.Equal(10, state.Plugs.Count);
    }

    [Fact]
    public void Should_report_the_applied_key_as_unmodified_When_a_key_is_applied()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("t", "Triton", "1942-11", Provenance.UserDefined, "19" + M4Row[1..]));
        var handler = new ApplyDailyKeyHandler(Linking.For(repository), new FakeMachineSessionStore());

        // Act
        var state = handler.Handle(new ApplyDailyKey("t", 19));

        // Assert
        Assert.Equal(new AppliedKeyState("t", "Triton", "1942-11", 19, false, "QRSA"), state.AppliedKey);
    }

    [Fact]
    public void Should_mark_the_applied_key_as_modified_When_a_plug_is_moved_but_not_when_a_rotor_is_turned()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("t", "Hydra", "1944-06", Provenance.UserDefined));
        var store = new FakeMachineSessionStore();
        new ApplyDailyKeyHandler(Linking.For(repository), store).Handle(new ApplyDailyKey("t", 1));

        // Act
        var turned = new TurnRotorHandler(store).Handle(new TurnRotor("Right", "Q"));
        var moved = new MovePlugHandler(store).Handle(new MovePlug("A", "B"));

        // Assert
        Assert.False(turned.AppliedKey!.Modified);
        Assert.True(moved.AppliedKey!.Modified);
        Assert.Equal(1, moved.AppliedKey.Day);
    }

    [Fact]
    public void Should_forget_the_applied_key_When_the_model_is_switched()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("t", "Hydra", "1944-06", Provenance.UserDefined));
        var store = new FakeMachineSessionStore();
        new ApplyDailyKeyHandler(Linking.For(repository), store).Handle(new ApplyDailyKey("t", 1));

        // Act
        var state = new CreateMachineHandler(store).Handle(new CreateMachine("M4"));

        // Assert
        Assert.Null(state.AppliedKey);
        Assert.Null(new GetMachineStateHandler(store).Handle(new GetMachineState()).AppliedKey);
    }

    [Fact]
    public void Should_keep_the_machine_When_the_sheet_has_no_key_for_the_day()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("t", "Hydra", "1944-06", Provenance.UserDefined));
        var store = new FakeMachineSessionStore();
        var original = store.Machine;
        var handler = new ApplyDailyKeyHandler(Linking.For(repository), store);

        // Act
        void Act() => handler.Handle(new ApplyDailyKey("t", 2));

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Same(original, store.Machine);
    }

    [Fact]
    public void Should_include_the_book_and_the_table_set_When_a_sheet_is_exported()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("t", "Triton", "1944-06", Provenance.Generated, M4Row));
        var handler = new ExportKeySheetHandler(Linking.For(repository));

        // Act
        var document = handler.Handle(new ExportKeySheet("t"));

        // Assert
        Assert.Null(document.Id);
        Assert.Null(document.Provenance);
        Assert.Equal(document.KenngruppenbuchId, document.Kenngruppenbuch!.Id);
        Assert.Equal(document.TauschtafelSetId, document.Tauschtafeln!.Id);
        Assert.Contains(document.Kenngruppenbuch.Allotments, a => a.Network == "Triton");
        Assert.Equal(1944, document.Tauschtafeln.Year);
    }

    [Fact]
    public void Should_link_the_sheet_to_the_same_book_and_tables_When_an_exported_sheet_is_imported_elsewhere()
    {
        // Arrange
        var sender = new FakeKeySheetRepository(Sheet("t", "Triton", "1944-06", Provenance.Generated, M4Row));
        var exported = new ExportKeySheetHandler(Linking.For(sender)).Handle(new ExportKeySheet("t"));
        var receiver = new FakeKeySheetRepository();
        var books = new FakeKenngruppenbuchRepository();
        var tables = new FakeTauschtafelSetRepository();
        var handler = new ImportKeySheetHandler(receiver, Linking.For(receiver, books, tables));

        // Act
        var details = handler.Handle(new ImportKeySheet(exported));

        // Assert
        Assert.Equal(exported.KenngruppenbuchId, details.KenngruppenbuchId);
        Assert.Equal(exported.TauschtafelSetId, details.TauschtafelSetId);
        Assert.Equal(exported.Kenngruppenbuch!.Columns, ProcedureMapper.ToDocument(books.Books[details.KenngruppenbuchId!]).Columns);
        Assert.True(tables.Sets[details.TauschtafelSetId!].IsSameAs(ProcedureMapper.FromDocument(exported.Tauschtafeln!)));
    }

    [Fact]
    public void Should_add_the_new_allotments_When_the_imported_book_is_already_here()
    {
        // Arrange
        var sender = new FakeKeySheetRepository(Sheet("t", "Triton", "1944-06", Provenance.Generated, M4Row));
        var senderBooks = new FakeKenngruppenbuchRepository();
        var senderLinker = Linking.For(sender, senderBooks);
        var first = new ExportKeySheetHandler(senderLinker).Handle(new ExportKeySheet("t"));
        var receiver = new FakeKeySheetRepository();
        var books = new FakeKenngruppenbuchRepository();
        var import = new ImportKeySheetHandler(receiver, Linking.For(receiver, books));
        import.Handle(new ImportKeySheet(first));
        sender.Save(Sheet("n", "Neptun", "1944-06", Provenance.Generated, M4Row));
        var second = new ExportKeySheetHandler(senderLinker).Handle(new ExportKeySheet("n"));

        // Act
        import.Handle(new ImportKeySheet(second));

        // Assert
        var book = Assert.Single(books.Books.Values);
        Assert.Equal(senderBooks.Books[book.Id].Allotments, book.Allotments);
        Assert.Equal(2, receiver.Sheets.Count);
    }

    [Fact]
    public void Should_store_nothing_When_the_imported_table_set_differs_from_the_one_here()
    {
        // Arrange
        var sender = new FakeKeySheetRepository(Sheet("t", "Triton", "1944-06", Provenance.Generated, M4Row));
        var exported = new ExportKeySheetHandler(Linking.For(sender)).Handle(new ExportKeySheet("t"));
        var clash = TauschtafelSet.Generate(exported.TauschtafelSetId!, 1944, new Random(99));
        var receiver = new FakeKeySheetRepository();
        var books = new FakeKenngruppenbuchRepository();
        var handler = new ImportKeySheetHandler(receiver, Linking.For(receiver, books, new FakeTauschtafelSetRepository(clash)));

        // Act
        void Act() => handler.Handle(new ImportKeySheet(exported));

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal($"The Tauschtafel set {clash.Id} differs from the one with the same id here.", exception.Message);
        Assert.Empty(receiver.Sheets);
        Assert.Empty(books.Books);
    }
}
