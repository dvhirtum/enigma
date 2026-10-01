using Enigma.Application.Bombe;
using Enigma.Application.Procedure;
using Enigma.Application.Tests.KeySheets;
using Enigma.Application.Tests.Procedure;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.Bombe;

public sealed class IndicatorHandlerTests
{
    // An exercise whose middle rotor does not turn over under the crib, so the Bombe stops at its key.
    private const int ExerciseSeed = 8;

    private readonly FakeBombeSessionStore _store = new();
    private readonly KeySheetLinker _linker = Linking.For(new FakeKeySheetRepository(
        KeySheetGenerator.Generate("t", MachineModel.M3, "Triton", KeyMonth.Parse("1944-06"), new Random(1))));

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    [Fact]
    public void Should_give_the_days_Grundstellung_table_and_traffic_When_the_pinch_of_an_exercise_is_taken()
    {
        // Arrange
        var solution = GenerateExercise();

        // Act
        var state = TakePinch();

        // Assert
        var day = Assert.IsType<DayState>(state.Day);
        Assert.Equal("t", day.SheetId);
        Assert.Equal(solution.Exercise!.Day, day.Day);
        Assert.Equal(solution.Exercise.Grundstellung, day.Grundstellung);
        Assert.Equal(Bigram.Count / 2, day.Swaps.Count);
        Assert.InRange(day.Messages.Count, 4, 6);
        Assert.Equal(state.Source!.Message, day.Messages[0].Message);
        Assert.All(day.Messages, message => Assert.Null(message.Verfahrenkenngruppe));
    }

    [Fact]
    public void Should_mark_the_groups_written_down_When_they_are_wrong_or_filled_in()
    {
        // Arrange
        var solution = GenerateExercise();
        TakePinch();
        var right = solution.Exercise!.Verfahrenkenngruppe;
        var wrong = right == "AAA" ? "AAB" : "AAA";

        // Act
        var written = new WriteIndicatorHandler(_store).Handle(new WriteIndicator(0, null, wrong.ToLowerInvariant()));
        var filled = new FillInIndicatorHandler(_store).Handle(new FillInIndicator(0));
        var rubbedOut = new WriteIndicatorHandler(_store).Handle(new WriteIndicator(0, "", null));

        // Assert
        Assert.Equal(wrong, written.Day!.Messages[0].Verfahrenkenngruppe);
        Assert.False(written.Day.Messages[0].VerfahrenkenngruppeRight);
        Assert.Null(written.Day.Messages[0].SchluesselkenngruppeRight);
        Assert.Equal(solution.Exercise.Schluesselkenngruppe, filled.Day!.Messages[0].Schluesselkenngruppe);
        Assert.True(filled.Day.Messages[0].SchluesselkenngruppeRight);
        Assert.Equal(right, filled.Day.Messages[0].Verfahrenkenngruppe);
        Assert.True(filled.Day.Messages[0].VerfahrenkenngruppeRight);
        Assert.Null(rubbedOut.Day!.Messages[0].Schluesselkenngruppe);
        Assert.Equal(right, rubbedOut.Day.Messages[0].Verfahrenkenngruppe);
    }

    [Fact]
    public async Task Should_read_the_solutions_rings_and_message_When_the_true_stops_row_of_the_ring_table_is_picked()
    {
        // Arrange
        var solution = GenerateExercise();
        var stop = await RunTrueStopAsync(solution);
        TakePinch();
        new FillInIndicatorHandler(_store).Handle(new FillInIndicator(0));

        // Act
        var table = new GetRingTableHandler(_store).Handle(new GetRingTable(stop));
        var check = new ReadRingsHandler(_store).Handle(new ReadRings(stop, solution.Rings[0], solution.Rings[1]));

        // Assert
        Assert.Equal(676, table.Rows.Count);
        Assert.Equal(solution.Exercise!.Verfahrenkenngruppe, table.Verfahrenkenngruppe);
        var row = table.Rows.Single(row => row.Left == solution.Rings[0] && row.Middle == solution.Rings[1]);
        Assert.Equal(table.Cores, row.Cores);
        Assert.Equal(solution.MessageKey, row.Spruchschluessel);
        var reading = Assert.IsType<ReadingState>(check.Reading);
        Assert.True(reading.RingsRight);
        Assert.Equal(solution.Rings, reading.Key.Rings);
        Assert.Equal(solution.MessageKey, reading.Key.MessageKey);
        Assert.Equal(solution.Plaintext, reading.Decrypt);
    }

    [Fact]
    public async Task Should_forget_the_rings_and_say_a_wrong_row_is_wrong_When_rings_are_read_again()
    {
        // Arrange
        var solution = GenerateExercise();
        var stop = await RunTrueStopAsync(solution);
        TakePinch();
        new FillInIndicatorHandler(_store).Handle(new FillInIndicator(0));
        var handler = new ReadRingsHandler(_store);

        // Act
        var wrong = handler.Handle(new ReadRings(stop, (solution.Rings[0] % 26) + 1, solution.Rings[1]));
        var forgotten = handler.Handle(new ReadRings(stop, null, null));

        // Assert
        Assert.False(wrong.Reading?.RingsRight);
        Assert.Null(forgotten.Reading);
    }

    [Fact]
    public async Task Should_refuse_the_ring_table_When_the_Verfahrenkenngruppe_is_not_written_down()
    {
        // Arrange
        var solution = GenerateExercise();
        var stop = await RunTrueStopAsync(solution);
        TakePinch();

        // Act
        void Act() => new GetRingTableHandler(_store).Handle(new GetRingTable(stop));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_refuse_the_pinch_When_the_message_is_an_intercept()
    {
        // Arrange
        new LoadInterceptHandler(_store).Handle(new LoadIntercept("scharnhorst-1943"));

        // Act
        void Act() => TakePinch();

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_take_the_pinch_of_the_day_chosen_When_a_radio_message_is_pasted()
    {
        // Arrange
        var solution = GenerateExercise();
        var message = _store.Job.Source!.Message!.ToString();
        new SetCipherTextHandler(_store).Handle(new SetCipherText(message));
        var handler = new TakePinchHandler(_store, _linker, new Random(5));

        // Act
        void Unchosen() => handler.Handle(new TakePinch(null, null));
        var state = handler.Handle(new TakePinch("t", solution.Exercise!.Day));

        // Assert
        Assert.Throws<DomainException>(Unchosen);
        Assert.Equal(solution.Exercise.Grundstellung, state.Day?.Grundstellung);
        Assert.Equal(message, state.Day?.Messages[0].Message);
    }

    [Fact]
    public void Should_clear_the_days_traffic_When_another_message_is_loaded()
    {
        // Arrange
        GenerateExercise();
        TakePinch();

        // Act
        var state = new LoadInterceptHandler(_store).Handle(new LoadIntercept("carter-weather"));

        // Assert
        Assert.Null(state.Day);
    }

    private SolutionState GenerateExercise()
    {
        new GenerateExerciseHandler(_store, _linker, new Random(ExerciseSeed)).Handle(new GenerateExercise());
        return new GetSolutionHandler(_store).Handle(new GetSolution());
    }

    private BombeState TakePinch() => new TakePinchHandler(_store, _linker, new Random(5)).Handle(new TakePinch(null, null));

    // Places the exercise's crib, runs its wheel order and returns the index of the stop the solution confirms, with
    // every plug pair and the right ring of the solution entered.
    private async Task<int> RunTrueStopAsync(SolutionState solution)
    {
        var crib = new GetSourceCribHandler(_store).Handle(new GetSourceCrib()).Crib;
        new SetCribHandler(_store).Handle(new SetCrib(crib));
        new PlaceCribHandler(_store).Handle(new PlaceCrib(solution.Plaintext.IndexOf(crib, StringComparison.Ordinal)));
        new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, solution.Reflector));
        foreach (var (row, rotor) in solution.WheelOrder.Split(' ').Index())
        {
            new FitRowHandler(_store).Handle(new FitRow(0, row, 11, rotor));
        }

        new PlugUpMenuHandler(_store).Handle(new PlugUpMenu());
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, Notebook: true));
        await _store.Run!.Completion.WaitAsync(TimeSpan.FromSeconds(60), Token);
        var stop = Enumerable.Range(0, _store.Stops.Count).Single(index =>
            new ConfirmCheckHandler(_store).Handle(new ConfirmCheck(index, "True")).Solution!.IsTrueStop);
        new SetCheckHandler(_store).Handle(new SetCheck(stop, string.Join(' ', solution.Plugs), solution.Rings[2]));
        return stop;
    }
}
