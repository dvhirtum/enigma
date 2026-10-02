using Enigma.Domain.Bombe;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;
using Enigma.Domain.Tests.KeyProcedure;

namespace Enigma.Domain.Tests.Bombe;

public sealed class DayTrafficTests
{
    private const string Network = "Triton";
    private const int Day = 19;

    private static readonly KeyMonth Month = new(1944, 6);

    private static readonly KeySheet Sheet =
        KeySheetGenerator.Generate("sheet", MachineModel.M3, Network, Month, new Random(1));

    private static readonly Kenngruppenbuch Book = Procedures.Book(Network);
    private static readonly TauschtafelSet Tables = TauschtafelSet.Generate("tables", 1944, new Random(3));

    [Fact]
    public void Should_write_down_the_indicators_groups_When_filled_in()
    {
        // Arrange
        var (traffic, source) = Traffic();

        // Act
        traffic.FillIn(0);

        // Assert
        var message = traffic.Messages[0];
        Assert.Equal(source.Solution!.Exercise!.Indicator.Schluesselkenngruppe, message.Schluesselkenngruppe);
        Assert.Equal(source.Solution.Exercise.Indicator.Verfahrenkenngruppe, message.Verfahrenkenngruppe);
        Assert.Equal(message.Verfahrenkenngruppe, traffic.WrittenVerfahrenkenngruppe(0));
    }

    [Fact]
    public void Should_read_every_other_message_of_the_day_When_its_indicator_is_turned_back_with_the_pinch()
    {
        // Arrange
        var (traffic, _) = Traffic();

        // Act
        var indicators = Enumerable.Range(1, traffic.Messages.Count - 1).Select(traffic.IndicatorOf).ToList();

        // Assert
        Assert.Equal(traffic.Messages.Skip(1).Select(message => message.Solution!.Exercise!.Indicator), indicators);
    }

    [Fact]
    public void Should_refuse_the_Verfahrenkenngruppe_When_none_or_a_wrong_one_is_written_down()
    {
        // Arrange
        var (traffic, source) = Traffic();
        var right = source.Solution!.Exercise!.Indicator.Verfahrenkenngruppe;
        var wrong = Kenngruppe.Parse(right.ToString() == "AAA" ? "AAB" : "AAA");

        // Act
        var missing = Record.Exception(() => traffic.WrittenVerfahrenkenngruppe(0));
        traffic.Write(0, null, wrong);
        var mistaken = Record.Exception(() => traffic.WrittenVerfahrenkenngruppe(0));

        // Assert
        Assert.IsType<DomainException>(missing);
        Assert.IsType<DomainException>(mistaken);
    }

    [Fact]
    public void Should_clear_the_days_traffic_When_another_message_is_loaded()
    {
        // Arrange
        var job = new BombeJob();
        var source = ExerciseGenerator.Generate(Sheet, Day, Book, Tables, new Random(1));
        job.Load(source);
        job.TakePinch(Pinch(), []);

        // Act
        job.Load(source);

        // Assert
        Assert.Null(job.Traffic);
    }

    [Fact]
    public void Should_refuse_the_pinch_When_the_message_is_bare_cipher_text()
    {
        // Arrange
        var job = new BombeJob();
        job.Load(MessageSource.Pasted("ABCDEFGH"));

        // Act
        void Act()
        {
            job.TakePinch(Pinch(), []);
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    private static Pinch Pinch()
    {
        return new Pinch(Sheet.Id, Network, Month, Day, Sheet.KeyFor(Day).Grundstellung!, Tables.TableFor(Month, Day));
    }

    private static (DayTraffic Traffic, MessageSource Source) Traffic()
    {
        var source = ExerciseGenerator.Generate(Sheet, Day, Book, Tables, new Random(1));
        var others = ExerciseGenerator.DayTraffic(Sheet, Day, Book, Tables, new Random(2));
        return (new DayTraffic(Pinch(), source.Message!, others), source);
    }
}
