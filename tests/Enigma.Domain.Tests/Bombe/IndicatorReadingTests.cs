using Enigma.Domain.Bombe;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;
using Enigma.Domain.Tests.KeyProcedure;

namespace Enigma.Domain.Tests.Bombe;

public sealed class IndicatorReadingTests
{
    private const string Network = "Triton";
    private const int Day = 19;

    private static readonly KeyMonth Month = new(1944, 6);

    private static readonly KeySheet Sheet =
        KeySheetGenerator.Generate("sheet", MachineModel.M3, Network, Month, new Random(1));

    private static readonly Kenngruppenbuch Book = Procedures.Book(Network);
    private static readonly TauschtafelSet Tables = TauschtafelSet.Generate("tables", 1944, new Random(3));

    public static TheoryData<int> Seeds => [.. Enumerable.Range(0, 8)];

    [Theory]
    [MemberData(nameof(Seeds))]
    public void
        Should_give_the_stops_cores_in_the_row_of_the_solutions_rings_When_the_ring_table_is_worked_with_the_pinch(
            int seed)
    {
        // Arrange
        var (check, source) = TrueCheck(seed);
        var exercise = source.Solution!.Exercise!;

        // Act
        var rows = check.RingTable(exercise.Grundstellung, exercise.Indicator.Verfahrenkenngruppe);

        // Assert
        Assert.Equal(Letter.Count * Letter.Count, rows.Count);
        var row = Assert.Single(rows,
            row => row.Left == source.Solution.Rings[0] && row.Middle == source.Solution.Rings[1]);
        Assert.Equal(source.Solution.MessageKey, row.Spruchschluessel);
        Assert.Equal(check.Stop.Position, row.Cores);
    }

    [Theory]
    [MemberData(nameof(Seeds))]
    public void Should_give_the_solutions_key_and_plain_text_When_the_solutions_rings_are_read(int seed)
    {
        // Arrange
        var (check, source) = TrueCheck(seed);
        var solution = source.Solution!;
        var exercise = solution.Exercise!;

        // Act
        check.Reading = new IndicatorReading(exercise.Grundstellung, exercise.Indicator.Verfahrenkenngruppe,
            solution.Rings[0], solution.Rings[1]);

        // Assert
        var key = Assert.IsType<CheckedKey>(check.ReadKey);
        Assert.Equal(solution.Rings, key.Rings);
        Assert.Equal(solution.MessageKey, key.MessageKey);
        Assert.Equal(solution.Plugs.ToHashSet(), key.Plugs.ToHashSet());
        Assert.Equal(solution.Plaintext, check.ReadDecrypt());
    }

    [Fact]
    public void Should_have_no_key_or_decrypt_When_no_rings_are_read()
    {
        // Arrange
        var (check, _) = TrueCheck(0);

        // Act
        var key = check.ReadKey;

        // Assert
        Assert.Null(key);
        Assert.Null(check.ReadDecrypt());
    }

    // An exercise with the check of its true stop: every plug pair known and the right ring of the solution.
    private static (StopCheck Check, MessageSource Source) TrueCheck(int seed)
    {
        var source = ExerciseGenerator.Generate(Sheet, Day, Book, Tables, new Random(seed));
        var solution = source.Solution!;
        var position = solution.Plaintext.IndexOf(source.Crib!.ToString(), StringComparison.Ordinal);
        var order = solution.WheelOrder;
        var machine = new DailyKey(1, solution.Reflector, [order.Left, order.Middle, order.Right], solution.Rings,
            solution.Plugs).SetUp();
        Procedures.Turn(machine, solution.MessageKey);
        foreach (var letter in source.CipherText.Take(position))
        {
            machine.PressKey(letter);
            machine.ReleaseKey();
        }

        var windows = RotorPositions.ShownOn(machine)!.Positions;
        var core = new DrumPosition(
            windows[0].Letter.Shift(-solution.Rings[0].Letter.Index),
            windows[1].Letter.Shift(-solution.Rings[1].Letter.Index),
            windows[2].Letter.Shift(-solution.Rings[2].Letter.Index));
        var placement = new CribPlacement(source.CipherText, source.Crib, position);
        var check = new StopCheck(new BombeStop(order, core, Letter.A, []), solution.Reflector, placement)
        {
            Steckers = Steckers.Parse(string.Join(' ', solution.Plugs.Select(plug => plug.ToString()))),
            RightRing = solution.Rings[2]
        };
        return (check, source);
    }
}
