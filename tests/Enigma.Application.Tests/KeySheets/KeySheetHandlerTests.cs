using Enigma.Application.KeySheets;
using Enigma.Application.Tests.Machine;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.KeySheets;

public sealed class KeySheetHandlerTests
{
    private const string M3Row = "1 B I II III 01 01 01 AT\n";
    private const string M4Row = "1 B-thin Beta II IV I 01 01 01 22 AT BL DF GJ HM NW OP QY RZ VX ABC\n";

    private static KeySheet Sheet(string id, string network, string month, Provenance provenance, string text = M3Row) =>
        new(id, network, KeyMonth.Parse(month), provenance, KeySheetText.Parse(text));

    [Fact]
    public void Should_store_a_user_defined_sheet_When_a_sheet_is_created_from_text()
    {
        // Arrange
        var repository = new FakeKeySheetRepository();
        var handler = new CreateKeySheetHandler(repository);

        // Act
        var details = handler.Handle(new CreateKeySheet("Triton", "1944-06", M4Row));

        // Assert
        var stored = Assert.Single(repository.Sheets.Values);
        Assert.Equal(stored.Id, details.Id);
        Assert.Equal("M4", details.Model);
        Assert.Equal("UserDefined", details.Provenance);
        Assert.False(details.ReadOnly);
        Assert.Equal(M4Row, details.Text);
        Assert.Equal(["Beta", "II", "IV", "I"], Assert.Single(details.Days).Rotors);
    }

    [Fact]
    public void Should_keep_the_repository_unchanged_When_the_text_is_invalid()
    {
        // Arrange
        var repository = new FakeKeySheetRepository();
        var handler = new CreateKeySheetHandler(repository);

        // Act
        void Act() => handler.Handle(new CreateKeySheet("Triton", "1944-06", "1 B I II"));

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Empty(repository.Sheets);
    }

    [Fact]
    public void Should_keep_the_provenance_When_a_generated_sheet_is_updated()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("g", "Hydra", "1944-06", Provenance.Generated));
        var handler = new UpdateKeySheetHandler(repository);

        // Act
        var details = handler.Handle(new UpdateKeySheet("g", "Triton", "1944-07", M4Row));

        // Assert
        Assert.Equal("Triton", details.Network);
        Assert.Equal("1944-07", details.Month);
        Assert.Equal("Generated", details.Provenance);
        Assert.Equal("Triton", repository.Sheets["g"].Network);
    }

    [Fact]
    public void Should_reject_the_change_When_a_historical_sheet_is_updated_or_deleted()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("h", "Hydra", "1944-06", Provenance.Historical("source")));
        var update = new UpdateKeySheetHandler(repository);
        var delete = new DeleteKeySheetHandler(repository);

        // Act
        void Update() => update.Handle(new UpdateKeySheet("h", "Triton", "1944-06", M3Row));
        void Delete() => delete.Handle(new DeleteKeySheet("h"));

        // Assert
        Assert.Throws<DomainException>(Update);
        Assert.Throws<DomainException>(Delete);
        Assert.Equal("Hydra", repository.Sheets["h"].Network);
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
        var handler = new GetKeySheetHandler(new FakeKeySheetRepository());

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
        var handler = new ListKeySheetsHandler(repository);

        // Act
        var sheets = handler.Handle(new ListKeySheets());

        // Assert
        Assert.Equal(["h", "a", "b"], sheets.Select(s => s.Id));
        Assert.True(sheets[0].ReadOnly);
        Assert.Equal("source", sheets[0].Source);
    }

    [Fact]
    public void Should_store_a_full_month_When_a_sheet_is_generated()
    {
        // Arrange
        var repository = new FakeKeySheetRepository();
        var handler = new GenerateKeySheetHandler(repository, new Random(1));

        // Act
        var details = handler.Handle(new GenerateKeySheet("M4", "Triton", "1944-06"));

        // Assert
        Assert.Equal(30, details.Days.Count);
        Assert.Equal("Generated", details.Provenance);
        Assert.Contains(details.Id, repository.Sheets.Keys);
    }

    [Fact]
    public void Should_store_the_sheet_as_user_defined_When_a_file_is_imported()
    {
        // Arrange
        var repository = new FakeKeySheetRepository();
        var handler = new ImportKeySheetHandler(repository);
        var document = new KeySheetDocument(
            "historical-x", "Hydra", "1943-12", "Historical", "made up",
            [new DailyKeyDocument(26, "B", ["III", "VI", "VIII"], [1, 8, 13], ["AN", "EZ"], null)]);

        // Act
        var details = handler.Handle(new ImportKeySheet(document));

        // Assert
        Assert.NotEqual("historical-x", details.Id);
        Assert.Equal("UserDefined", details.Provenance);
        Assert.Null(details.Source);
        Assert.Equal("26 B III VI VIII 01 08 13 AN EZ\n", details.Text);
    }

    [Fact]
    public void Should_name_the_day_When_an_imported_day_is_invalid()
    {
        // Arrange
        var handler = new ImportKeySheetHandler(new FakeKeySheetRepository());
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
        var handler = new ApplyDailyKeyHandler(repository, store);

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
    public void Should_keep_the_machine_When_the_sheet_has_no_key_for_the_day()
    {
        // Arrange
        var repository = new FakeKeySheetRepository(Sheet("t", "Hydra", "1944-06", Provenance.UserDefined));
        var store = new FakeMachineSessionStore();
        var original = store.Machine;
        var handler = new ApplyDailyKeyHandler(repository, store);

        // Act
        void Act() => handler.Handle(new ApplyDailyKey("t", 2));

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Same(original, store.Machine);
    }
}
