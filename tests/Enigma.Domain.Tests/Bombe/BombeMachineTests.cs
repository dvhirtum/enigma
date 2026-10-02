using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;
using Enigma.Domain.Tests.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class BombeMachineTests(ITestOutputHelper output)
{
    private static readonly Letter G = Letter.FromChar('G');
    private static readonly Letter A = Letter.FromChar('A');
    private static readonly Letter Q = Letter.FromChar('Q');

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Should_stop_at_the_true_key_When_running_Carters_weather_menu(bool diagonalBoard)
    {
        // Arrange
        // The key is II V III, reflector B, rings ZZZ, windows ULA: core positions VMB. It is the only key that
        // enciphers the whole crib with Carter's ten stecker pairs. The drums show WPC and the indicator drums DKX, as
        // Carter reports.
        var bombe = new BombeMachine(
            new Scrambler(WheelOrder.Parse("II V III"), ReflectorType.B), BombeKeys.CarterMenu, A, diagonalBoard);

        // Act
        var stops = bombe.Run().ToList();

        // Assert
        output.WriteLine($"Diagonal board {diagonalBoard}: {stops.Count} stops.");
        var stop = Assert.Single(stops, stop => stop.Position == DrumPosition.Parse("VMB"));
        Assert.Equal(Q, stop.Stecker);
        Assert.Equal("DKX", stop.Indicator.ToString());
    }

    [Fact]
    public void Should_miss_the_true_key_When_a_scrambler_is_set_to_the_wrong_letters()
    {
        // Arrange
        var menu = BombeKeys.CarterMenu;
        DrumPosition[] starts = [.. menu.Links.Select(link => DrumPosition.FromOffset(link.Offset))];
        starts[3] = DrumPosition.Parse("ZZX");
        var bombe = new BombeMachine(new Scrambler(WheelOrder.Parse("II V III"), ReflectorType.B), menu, A,
            starts: starts);

        // Act
        var stop = bombe.Test(DrumPosition.Parse("VMB"));

        // Assert
        Assert.Null(stop);
    }

    [Fact]
    public void Should_stop_at_the_true_key_When_the_scramblers_are_set_to_the_link_offsets_by_hand()
    {
        // Arrange
        var menu = BombeKeys.CarterMenu;
        DrumPosition[] starts =
            [.. menu.Links.Select(link => DrumPosition.Parse("ZZ" + (char)('A' + link.Offset - 1)))];
        var bombe = new BombeMachine(new Scrambler(WheelOrder.Parse("II V III"), ReflectorType.B), menu, A,
            starts: starts);

        // Act
        var stop = bombe.Test(DrumPosition.Parse("VMB"));

        // Assert
        Assert.Equal(Q, stop?.Stecker);
    }

    [Fact]
    public void Should_give_two_stops_as_Carter_reports_When_running_his_weather_menu_with_the_diagonal_board()
    {
        // Arrange
        var bombe = new BombeMachine(
            new Scrambler(WheelOrder.Parse("II V III"), ReflectorType.B), BombeKeys.CarterMenu, A);

        // Act
        var stops = bombe.Run().Count();

        // Assert
        Assert.Equal(2, stops);
    }

    [Fact]
    public void Should_light_only_the_stecker_partner_When_the_input_is_the_true_stecker()
    {
        // Arrange
        var bombe = new BombeMachine(
            new Scrambler(WheelOrder.Parse("II V III"), ReflectorType.B), BombeKeys.CarterMenu, Q);

        // Act
        var stop = bombe.Test(DrumPosition.Parse("VMB"));

        // Assert
        Assert.NotNull(stop);
        Assert.Equal([Q], stop.LiveWires);
    }

    [Fact]
    public void Should_leave_only_the_stecker_partner_dead_When_the_input_is_a_wrong_stecker()
    {
        // Arrange
        var bombe = new BombeMachine(
            new Scrambler(WheelOrder.Parse("II V III"), ReflectorType.B), BombeKeys.CarterMenu, A);

        // Act
        var stop = bombe.Test(DrumPosition.Parse("VMB"));

        // Assert
        Assert.NotNull(stop);
        Assert.Equal(Letter.Count - 1, stop.LiveWires.Count);
        Assert.DoesNotContain(Q, stop.LiveWires);
    }

    [Theory]
    [InlineData("I II III", "01 01 01", "AD CN ET FL GI JV KZ PU QY WX", "AAW", "E")]
    [InlineData("IV VIII II", "13 02 20", "AB CD EF GH IJ KL MN OP QR ST", "RWF", "R")]
    [InlineData("VII III I", "08 21 16", "AZ BY CX DW EV FU GT HS IR JQ", "KBR", "T")]
    public void Should_stop_at_the_core_positions_with_the_true_stecker_When_the_crib_was_enciphered_with_the_key(
        string rotors, string rings, string plugs, string windows, string testRegister)
    {
        // Arrange
        const string plain = "WETTERVORHERSAGEBISKAYA";
        var machine = MachineBuilder.Build(MachineModel.M3, "B", rotors, rings, plugs, windows);
        var cipher = machine.Type(plain);
        var test = Letter.FromChar(testRegister[0]);
        var partner = Plugboard(plugs, test);
        var input = partner.Shift(1);
        var menu = new Menu(BombeKeys.FullMenu(cipher, plain), test);
        var bombe = new BombeMachine(new Scrambler(WheelOrder.Parse(rotors), ReflectorType.B), menu, input);
        var core = BombeKeys.CorePosition(rings, windows);

        // Act
        var stops = bombe.Run().ToList();

        // Assert
        output.WriteLine($"{rotors}: {stops.Count} stops.");
        var stop = Assert.Single(stops, stop => stop.Position == core);
        Assert.Equal(partner, stop.Stecker);
    }

    [Fact]
    public void Should_give_fewer_stops_When_the_diagonal_board_is_used()
    {
        // Arrange
        // Carter's menu without its closures: a chain with no loops, which stops often without the diagonal board.
        IReadOnlyList<MenuLink> chain =
            [.. "SW1 NE2 GE5 GR6 SV7 ZR9 HZ10 EU11 LG15".Split(' ').Select(MenuLink.Parse)];
        var scrambler = new Scrambler(WheelOrder.Parse("II V III"), ReflectorType.B);

        // Act
        var with = new BombeMachine(scrambler, new Menu(chain, G), A, true).Run().Count();
        var without = new BombeMachine(scrambler, new Menu(chain, G), A, false).Run().Count();

        // Assert
        output.WriteLine($"Chain menu: {with} stops with the diagonal board, {without} without.");
        Assert.True(with < without, $"{with} stops with the diagonal board, {without} without.");
    }

    [Fact]
    public void Should_reject_the_link_When_a_letter_enciphers_to_itself()
    {
        // Arrange
        // Act
        static void Act()
        {
            MenuLink.Parse("GG3");
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    private static Letter Plugboard(string plugs, Letter letter)
    {
        var pair = plugs.Split(' ').FirstOrDefault(pair => pair.Contains(letter.ToChar(), StringComparison.Ordinal));
        return pair is null ? letter : Letter.FromChar(pair[0] == letter.ToChar() ? pair[1] : pair[0]);
    }
}
