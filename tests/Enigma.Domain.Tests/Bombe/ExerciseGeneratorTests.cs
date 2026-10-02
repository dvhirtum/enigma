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

    [Theory]
    [MemberData(nameof(Seeds))]
    public void Should_send_3_to_5_messages_on_the_key_sheet_day_When_the_days_traffic_is_generated(int seed)
    {
        // Arrange
        var key = Sheet.KeyFor(Day);
        var context = new OperatorContext(Network, key.Grundstellung!, Book, Tables.TableFor(Month, Day));

        // Act
        var messages = ExerciseGenerator.DayTraffic(Sheet, Day, Book, Tables, new Random(seed));

        // Assert
        Assert.InRange(messages.Count, ExerciseGenerator.MinDayMessages, ExerciseGenerator.MaxDayMessages);
        Assert.Equal(messages.Select(message => message.Message.TimeOfOrigin).Order(), messages.Select(message => message.Message.TimeOfOrigin));
        Assert.All(messages, message =>
        {
            var procedure = OperatorProcedure.StartReceiving(context, message.Message);
            Assert.Empty(procedure.Warnings);
            Assert.Equal(
                message.Solution!.MessageKey,
                MessageKey.Derive(key, key.Grundstellung!, procedure.Indicator!.Verfahrenkenngruppe).Spruchschluessel);
            Assert.Equal(message.Solution.Plaintext, message.Solution.Decrypt([.. message.Message.CipherText.Select(Letter.FromChar)]));
            Assert.Null(message.Verfahrenkenngruppe);
        });
    }

    [Fact]
    public void Should_send_rendezvous_orders_mine_warnings_and_air_attack_reports_too_When_much_traffic_is_generated()
    {
        // Arrange
        var random = new Random(7);

        // Act
        var plaintexts = Enumerable.Range(0, 20)
            .SelectMany(_ => ExerciseGenerator.DayTraffic(Sheet, Day, Book, Tables, random))
            .Select(message => message.Solution!.Plaintext)
            .ToList();

        // Assert
        Assert.Contains(plaintexts, text => text.Contains("TREFFPUNKT", StringComparison.Ordinal));
        Assert.Contains(plaintexts, text => text.Contains("MINENWARNUNG", StringComparison.Ordinal));
        Assert.Contains(plaintexts, text => text.Contains("FLIEGERANGRIFF", StringComparison.Ordinal));
        Assert.Contains(plaintexts, text => text.Contains("WETTERVORHERSAGE", StringComparison.Ordinal));
    }

    [Fact]
    public void Should_keep_the_middle_rotor_still_during_the_crib_When_many_exercises_are_generated()
    {
        // Arrange
        var sources = Enumerable.Range(0, 100).Select(seed => ExerciseGenerator.Generate(Sheet, Day, Book, Tables, new Random(seed))).ToList();

        // Act
        var turnovers = sources.Count(MiddleTurnsOverDuringCrib);

        // Assert
        Assert.Equal(0, turnovers);
    }

    [Fact]
    public void Should_reject_the_day_When_its_right_rotor_has_two_notches()
    {
        // Arrange
        var day = Sheet.DailyKeys.First(key => key.Rotors[^1].Notches.Count == 2).Day;

        // Act
        void Act() => ExerciseGenerator.Generate(Sheet, day, Book, Tables, new Random(1));

        // Assert
        Assert.False(ExerciseGenerator.Suits(Sheet.KeyFor(day)));
        Assert.Throws<DomainException>(Act);
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

    // Types the plain text up to the end of the crib on an M3 set up with the solution, watching the middle rotor.
    private static bool MiddleTurnsOverDuringCrib(MessageSource source)
    {
        var solution = source.Solution!;
        var start = solution.Plaintext.IndexOf(source.Crib!.ToString(), StringComparison.Ordinal);
        var machine = new DailyKey(1, solution.Reflector, [solution.WheelOrder.Left, solution.WheelOrder.Middle, solution.WheelOrder.Right], solution.Rings, solution.Plugs).SetUp();
        foreach (var (slot, position) in machine.Model.Slots.Zip(solution.MessageKey.Positions))
        {
            machine.TurnRotor(slot, position);
        }

        Type(machine, solution.Plaintext[..start]);
        var middle = machine.Model.Slots[1];
        var atCrib = machine.RotorIn(middle)!.Position;
        Type(machine, source.Crib.ToString());
        return machine.RotorIn(middle)!.Position != atCrib;
    }

    private static void Type(EnigmaMachine machine, string text)
    {
        foreach (var letter in text)
        {
            machine.PressKey(Letter.FromChar(letter));
            machine.ReleaseKey();
        }
    }

    [Theory]
    [MemberData(nameof(Seeds))]
    public void Should_give_three_wheel_orders_with_rotor_I_to_V_on_the_right_When_an_exercise_is_generated(int seed)
    {
        // Arrange
        var source = ExerciseGenerator.Generate(Sheet, Day, Book, Tables, new Random(seed));

        // Act
        var hint = source.WheelOrders!;

        // Assert
        Assert.Equal(3, hint.Distinct().Count());
        Assert.Contains(source.Solution!.WheelOrder, hint);
        Assert.All(hint, order => Assert.Single(order.Right.Notches));
    }

    [Fact]
    public void Should_build_a_menu_with_at_least_two_loops_When_the_crib_is_in_its_right_place()
    {
        // Arrange
        var sources = Enumerable.Range(0, 100).Select(seed => ExerciseGenerator.Generate(Sheet, Day, Book, Tables, new Random(seed))).ToList();

        // Act
        var menus = sources.Select(source =>
        {
            var position = source.Solution!.Plaintext.IndexOf(source.Crib!.ToString(), StringComparison.Ordinal);
            return (Crib: source.Crib.ToString(), Menu: Menu.Build(new CribPlacement(source.CipherText, source.Crib, position)));
        }).ToList();

        // Assert
        Assert.Equal(4, menus.Select(menu => menu.Crib).Distinct().Count());
        Assert.All(menus, menu => Assert.True(menu.Menu.Loops >= ExerciseGenerator.MinLoops, $"{menu.Crib}: {menu.Menu.Loops} loops"));
    }
}
