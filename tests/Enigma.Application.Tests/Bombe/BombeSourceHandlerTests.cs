using Enigma.Application.Bombe;
using Enigma.Application.Procedure;
using Enigma.Application.Tests.KeySheets;
using Enigma.Application.Tests.Procedure;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.Bombe;

public sealed class BombeSourceHandlerTests
{
    private readonly FakeBombeSessionStore _store = new();

    private static KeySheet M3Sheet => new(
        "t", "Triton", KeyMonth.Parse("1944-06"), Provenance.UserDefined,
        KeySheetText.Parse("1 B I II III 01 01 01 AT QRS\n2 C IV VI VIII 05 12 20 BZ\n"));

    private static KeySheet M4Sheet => new(
        "m4", "Triton", KeyMonth.Parse("1944-06"), Provenance.UserDefined,
        KeySheetText.Parse("1 B-thin Beta I II III 01 01 01 01 AT QRST\n"));

    [Fact]
    public void Should_list_the_bundled_intercepts_When_asked()
    {
        // Arrange
        // Act
        var intercepts = ListInterceptsHandler.Handle(new ListIntercepts());

        // Assert
        Assert.Equal(["scharnhorst-1943", "barbarossa-1941-1", "barbarossa-1941-2", "carter-weather"],
            intercepts.Select(i => i.Id));
        Assert.Equal("1943-12-26", intercepts[0].Date);
        Assert.Null(intercepts[3].Date);
    }

    [Fact]
    public void Should_load_the_message_without_its_crib_When_an_intercept_is_chosen()
    {
        // Arrange
        new SetCribHandler(_store).Handle(new SetCrib("WETTER"));

        // Act
        var state = new LoadInterceptHandler(_store).Handle(new LoadIntercept("scharnhorst-1943"));

        // Assert
        Assert.Equal("Intercept", state.Source?.Kind);
        Assert.Equal("Scharnhorst, 26 December 1943", state.Source?.Title);
        Assert.StartsWith("1925 = 21 = UTKZ RBSB YKAE", state.Source?.Message, StringComparison.Ordinal);
        Assert.True(state.Source?.HasCrib);
        Assert.True(state.Source?.HasSolution);
        Assert.StartsWith("YKAENZAP", state.CipherText, StringComparison.Ordinal);
        Assert.Null(state.Crib);
    }

    [Fact]
    public void Should_report_not_found_When_the_intercept_is_unknown()
    {
        // Arrange
        // Act
        void Act()
        {
            new LoadInterceptHandler(_store).Handle(new LoadIntercept("u-110"));
        }

        // Assert
        Assert.Throws<NotFoundException>(Act);
    }

    [Fact]
    public void Should_give_the_crib_and_the_published_key_When_asked_for_an_intercept()
    {
        // Arrange
        new LoadInterceptHandler(_store).Handle(new LoadIntercept("scharnhorst-1943"));

        // Act
        var crib = new GetSourceCribHandler(_store).Handle(new GetSourceCrib());
        var solution = new GetSolutionHandler(_store).Handle(new GetSolution());

        // Assert
        Assert.Equal("STEUEREJTANAFJORD", crib.Crib);
        Assert.StartsWith("At the very start", crib.Place, StringComparison.Ordinal);
        Assert.Equal("B", solution.Reflector);
        Assert.Equal("III VI VIII", solution.WheelOrder);
        Assert.Equal([1, 8, 13], solution.Rings);
        Assert.Equal(["AN", "EZ", "HK", "IJ", "LR", "MQ", "OT", "PV", "SW", "UX"], solution.Plugs);
        Assert.Equal("UZV", solution.MessageKey);
        Assert.StartsWith("STEUEREJTANAFJORD", solution.Plaintext, StringComparison.Ordinal);
        Assert.Null(solution.Exercise);
    }

    [Fact]
    public void Should_read_a_radio_message_without_crib_or_solution_When_text_is_pasted()
    {
        // Arrange
        // Act
        var state = new SetCipherTextHandler(_store).Handle(
            new SetCipherText("1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI"));

        // Assert
        Assert.Equal("Pasted", state.Source?.Kind);
        Assert.Equal("1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI", state.Source?.Message);
        Assert.Equal("ABCDEFGH", state.CipherText);
        Assert.False(state.Source?.HasCrib);
        Assert.Throws<NotFoundException>(() => new GetSourceCribHandler(_store).Handle(new GetSourceCrib()));
        Assert.Throws<NotFoundException>(() => new GetSolutionHandler(_store).Handle(new GetSolution()));
    }

    [Fact]
    public void Should_clear_the_message_When_the_pasted_text_is_empty()
    {
        // Arrange
        new LoadInterceptHandler(_store).Handle(new LoadIntercept("carter-weather"));

        // Act
        var state = new SetCipherTextHandler(_store).Handle(new SetCipherText("  "));

        // Assert
        Assert.Null(state.Source);
        Assert.Empty(state.CipherText);
    }

    [Fact]
    public void Should_generate_an_exercise_from_a_day_of_an_M3_sheet_When_one_is_asked_for()
    {
        // Arrange
        var sheets = new FakeKeySheetRepository(M4Sheet, M3Sheet);
        var handler = new GenerateExerciseHandler(_store, Linking.For(sheets), new Random(4));

        // Act
        var state = handler.Handle(new GenerateExercise());
        var solution = new GetSolutionHandler(_store).Handle(new GetSolution());

        // Assert
        Assert.Equal("Exercise", state.Source?.Kind);
        Assert.StartsWith("Exercise, ", state.Source?.Title, StringComparison.Ordinal);
        Assert.NotNull(state.Source?.Message);
        Assert.Equal("t", solution.Exercise?.SheetId);
        Assert.Equal("1944-06", solution.Exercise?.Month);
        var crib = new GetSourceCribHandler(_store).Handle(new GetSourceCrib());
        Assert.Contains(crib.Crib, solution.Plaintext, StringComparison.Ordinal);
        Assert.StartsWith("At or near the start", crib.Place, StringComparison.Ordinal);
    }

    [Fact]
    public void Should_send_the_exercise_on_a_day_with_rotor_I_to_V_on_the_right_When_other_days_have_VI_to_VIII()
    {
        // Arrange
        var sheet = new KeySheet(
            "t", "Triton", KeyMonth.Parse("1944-06"), Provenance.UserDefined,
            KeySheetText.Parse(
                "1 B I II VI 01 01 01 AT QRS\n2 B I II III 01 01 01 AT QRS\n3 B I II VIII 01 01 01 AT QRS\n"));
        var linker = Linking.For(new FakeKeySheetRepository(sheet));

        // Act
        var days = Enumerable.Range(0, 20).Select(seed =>
        {
            new GenerateExerciseHandler(_store, linker, new Random(seed)).Handle(new GenerateExercise());
            return new GetSolutionHandler(_store).Handle(new GetSolution()).Exercise?.Day;
        }).ToList();

        // Assert
        Assert.All(days, day => Assert.Equal(2, day));
    }

    [Fact]
    public void Should_refuse_an_exercise_When_every_M3_day_has_rotor_VI_to_VIII_on_the_right()
    {
        // Arrange
        var sheet = new KeySheet(
            "t", "Triton", KeyMonth.Parse("1944-06"), Provenance.UserDefined,
            KeySheetText.Parse("1 B I II VI 01 01 01 AT QRS\n2 B I II VII 01 01 01 AT QRS\n"));
        var handler =
            new GenerateExerciseHandler(_store, Linking.For(new FakeKeySheetRepository(sheet)), new Random(4));

        // Act
        void Act()
        {
            handler.Handle(new GenerateExercise());
        }

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Contains("VI, VII or VIII", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Should_refuse_an_exercise_When_there_are_no_M3_key_sheets()
    {
        // Arrange
        var handler =
            new GenerateExerciseHandler(_store, Linking.For(new FakeKeySheetRepository(M4Sheet)), new Random(4));

        // Act
        void Act()
        {
            handler.Handle(new GenerateExercise());
        }

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Contains("M3 key sheets", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Should_suggest_the_crib_of_the_message_type_When_pasted_text_is_given_one()
    {
        // Arrange
        new SetCipherTextHandler(_store).Handle(new SetCipherText("QWERT ZUIOP"));

        // Act
        var crib = new GetSourceCribHandler(_store).Handle(new GetSourceCrib("convoy"));

        // Assert
        Assert.Equal("FEINDLICHERGELEITZUG", crib.Crib);
        Assert.StartsWith("At or near the start", crib.Place, StringComparison.Ordinal);
    }

    [Fact]
    public void Should_suggest_the_intercepts_own_crib_When_a_message_type_is_given()
    {
        // Arrange
        new LoadInterceptHandler(_store).Handle(new LoadIntercept("barbarossa-1941-2"));

        // Act
        var crib = new GetSourceCribHandler(_store).Handle(new GetSourceCrib("weather"));

        // Assert
        Assert.Equal("AUFFLIEGERSTRASZE", crib.Crib);
        Assert.StartsWith("About 80 letters in", crib.Place, StringComparison.Ordinal);
    }

    [Fact]
    public void Should_say_not_found_When_the_message_type_is_unknown()
    {
        // Arrange
        new SetCipherTextHandler(_store).Handle(new SetCipherText("QWERT ZUIOP"));

        // Act
        void Act()
        {
            new GetSourceCribHandler(_store).Handle(new GetSourceCrib("letter"));
        }

        // Assert
        Assert.Throws<NotFoundException>(Act);
    }

    [Fact]
    public void Should_list_the_exercise_message_types_When_asked()
    {
        // Arrange
        // Act
        var types = ListMessageTypesHandler.Handle(new ListMessageTypes());

        // Assert
        Assert.Equal(["weather", "nothing-to-report", "own-position", "convoy"], types.Select(type => type.Id));
        Assert.Equal("Weather forecast", types[0].Name);
    }
}
