using Enigma.Domain.Bombe;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;
using Enigma.Domain.Tests.KeyProcedure;

namespace Enigma.Domain.Tests.Bombe;

public sealed class ExerciseGeneratorTests
{
    private const string Network = "Triton";
    private const int Day = 19;

    private static readonly KeyMonth Month = new(1944, 6);
    private static readonly KeySheet Sheet = KeySheetGenerator.Generate("sheet", MachineModel.M3, Network, Month, new Random(1));
    private static readonly Kenngruppenbuch Book = Procedures.Book(Network);
    private static readonly TauschtafelSet Tables = TauschtafelSet.Generate("tables", 1944, new Random(3));

    public static TheoryData<int> Seeds => [.. Enumerable.Range(0, 12)];

    [Theory]
    [MemberData(nameof(Seeds))]
    public void Should_decrypt_to_plain_text_with_the_crib_When_the_solution_key_is_used(int seed)
    {
        // Arrange
        var source = ExerciseGenerator.Generate(Sheet, Day, Book, Tables, new Random(seed));

        // Act
        var plaintext = source.Solution!.Decrypt(source.CipherText);

        // Assert
        Assert.Equal(SourceKind.Exercise, source.Kind);
        Assert.Equal(source.Solution.Plaintext, plaintext);
        Assert.Contains(source.Crib!.ToString(), plaintext, StringComparison.Ordinal);
        Assert.Equal(0, plaintext.Length % RadioMessage.GroupLength);
        Assert.Equal(source.Message!.CipherText, string.Concat(source.CipherText));
    }

    [Theory]
    [MemberData(nameof(Seeds))]
    public void Should_receive_the_exercise_without_warnings_When_the_key_sheet_day_is_used(int seed)
    {
        // Arrange
        var source = ExerciseGenerator.Generate(Sheet, Day, Book, Tables, new Random(seed));
        var key = Sheet.KeyFor(Day);
        var context = new OperatorContext(Network, key.Grundstellung!, Book, Tables.TableFor(Month, Day));

        // Act
        var procedure = OperatorProcedure.StartReceiving(context, RadioMessage.Parse(source.Transcript));

        // Assert
        Assert.Empty(procedure.Warnings);
        Assert.Equal(source.Solution!.Exercise!.Indicator, procedure.Indicator);
        Assert.Equal(
            source.Solution.MessageKey,
            MessageKey.Derive(key, key.Grundstellung!, procedure.Indicator!.Verfahrenkenngruppe).Spruchschluessel);
    }

    [Fact]
    public void Should_use_every_template_When_many_exercises_are_generated()
    {
        // Arrange
        var random = new Random(5);

        // Act
        var cribs = Enumerable.Range(0, 40)
            .Select(_ => ExerciseGenerator.Generate(Sheet, Day, Book, Tables, random).Crib!.ToString())
            .ToHashSet();

        // Assert
        Assert.Equal(["EIGENERSTANDORTQU", "FEINDLICHERGELEITZUG", "KEINEBESONDERENEREIGNISSE", "WETTERVORHERSAGE"], cribs.Order());
    }

    [Fact]
    public void Should_place_the_crib_after_a_prefix_When_some_exercises_are_generated()
    {
        // Arrange
        var random = new Random(6);

        // Act
        var positions = Enumerable.Range(0, 40)
            .Select(_ => ExerciseGenerator.Generate(Sheet, Day, Book, Tables, random))
            .Select(source => source.Solution!.Plaintext.IndexOf(source.Crib!.ToString(), StringComparison.Ordinal))
            .ToHashSet();

        // Assert
        Assert.Contains(0, positions);
        Assert.Contains(positions, position => position > 0);
    }

    [Fact]
    public void Should_reject_the_sheet_When_it_is_for_the_M4()
    {
        // Arrange
        var sheet = KeySheetGenerator.Generate("m4", MachineModel.M4, Network, Month, new Random(1));

        // Act
        void Act() => ExerciseGenerator.Generate(sheet, Day, Book, Tables, new Random(1));

        // Assert
        Assert.Throws<DomainException>(Act);
    }
}
