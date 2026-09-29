using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;
using Enigma.Domain.Tests.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class MenuTests(ITestOutputHelper output)
{
    private static readonly Letter E = Letter.FromChar('E');
    private static readonly Letter G = Letter.FromChar('G');
    private static readonly Letter Q = Letter.FromChar('Q');
    private static readonly Letter R = Letter.FromChar('R');
    private static readonly Letter W = Letter.FromChar('W');

    [Fact]
    public void Should_give_Carters_menu_When_building_from_his_weather_crib()
    {
        // Arrange
        // The crib's pairs 3, 4 and 8 (MT, KT, TO) form a separate part without loops, which Carter left off.
        var placement = new CribPlacement(
            [.. BombeKeys.CarterCipher.Select(Letter.FromChar)], Crib.Parse(BombeKeys.CarterCrib), 0);

        // Act
        var menu = Menu.Build(placement);

        // Assert
        Assert.Equal(
            BombeKeys.CarterMenu.Links.Select(link => link.Offset),
            menu.Links.Select(link => link.Offset));
        Assert.Equal(G, menu.TestRegister);
    }

    [Fact]
    public void Should_count_two_loops_When_rating_Carters_menu()
    {
        // Arrange
        var menu = BombeKeys.CarterMenu;

        // Act
        var loops = menu.Loops;

        // Assert
        Assert.Equal(2, loops);
    }

    [Theory]
    [InlineData('G', 4, 2)]
    [InlineData('R', 4, 2)]
    [InlineData('E', 4, 1)]
    [InlineData('W', 1, 0)]
    public void Should_count_the_links_and_loops_of_a_letter_When_rating_Carters_menu(char letter, int links, int loops)
    {
        // Arrange
        var menu = BombeKeys.CarterMenu;

        // Act
        var (linksAt, loopsThrough) = (menu.LinksAt(Letter.FromChar(letter)), menu.LoopsThrough(Letter.FromChar(letter)));

        // Assert
        Assert.Equal((links, loops), (linksAt, loopsThrough));
    }

    [Fact]
    public void Should_put_the_test_register_on_the_letter_with_most_links_then_loops_When_creating_a_menu()
    {
        // Arrange
        var links = BombeKeys.CarterMenu.Links;

        // Act
        var menu = Menu.Create(links);

        // Assert
        Assert.Equal(G, menu.TestRegister);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Should_estimate_the_false_stops_within_an_order_of_magnitude_When_rating_Carters_menu(bool diagonalBoard)
    {
        // Arrange
        var menu = BombeKeys.CarterMenu;
        var bombe = new BombeMachine(
            new Scrambler(WheelOrder.Parse("II V III"), ReflectorType.B), menu, Letter.A, diagonalBoard);
        var falseStops = bombe.Run().Count() - 1;

        // Act
        var estimate = menu.EstimatedStops(diagonalBoard);

        // Assert
        output.WriteLine($"Diagonal board {diagonalBoard}: {estimate:F2} estimated, {falseStops} false stops.");
        Assert.InRange(estimate, falseStops / 10.0, falseStops * 10.0);
    }

    [Fact]
    public void Should_estimate_fewer_stops_When_the_menu_has_more_loops()
    {
        // Arrange
        var chain = new Menu(
            [.. "SW1 NE2 GE5 GR6 SV7 ZR9 HZ10 EU11 LG15".Split(' ').Select(MenuLink.Parse)], G);

        // Act
        var (chainStops, carterStops) = (chain.EstimatedStops(true), BombeKeys.CarterMenu.EstimatedStops(true));

        // Assert
        Assert.Equal(0, chain.Loops);
        Assert.True(carterStops < chainStops, $"{carterStops} stops with loops, {chainStops} without.");
    }

    [Fact]
    public void Should_keep_one_connected_part_of_36_links_When_the_crib_gives_more()
    {
        // Arrange
        const string plain = "WETTERVORHERSAGEBISKAYAXWINDSUEDWESTSTAERKEDREIXSEEGANGVIERXSICHTZWOSEEMEILEN";
        var cipher = MachineBuilder.Build(MachineModel.M3, "B", "I II III", "01 01 01", "AD CN ET", "AAA").Type(plain);
        var placement = new CribPlacement([.. cipher.Select(Letter.FromChar)], Crib.Parse(plain), 0);

        // Act
        var menu = Menu.Build(placement);

        // Assert
        Assert.Equal(Menu.MaxLinks, menu.Links.Count);
        Assert.Equal(menu.Links, menu.ConnectedLinks);
    }

    [Fact]
    public void Should_refuse_to_build_a_menu_When_the_crib_crashes()
    {
        // Arrange
        var placement = new CribPlacement(
            [.. "QWERTZUIO".Select(Letter.FromChar)], Crib.Parse("ARXX"), 2);

        // Act
        object Act() => Menu.Build(placement);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_the_menu_When_the_test_register_letter_is_not_on_it()
    {
        // Arrange
        var links = BombeKeys.CarterMenu.Links;

        // Act
        object Act() => new Menu(links, Q);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_the_menu_When_two_links_share_an_offset()
    {
        // Arrange
        MenuLink[] links = [MenuLink.Parse("GE5"), MenuLink.Parse("GR5")];

        // Act
        object Act() => new Menu(links, G);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_the_menu_When_it_has_more_links_than_the_Bombe_has_scramblers()
    {
        // Arrange
        MenuLink[] links = [.. Enumerable.Range(1, Menu.MaxLinks + 1).Select(offset => new MenuLink(E, R, offset))];

        // Act
        object Act() => new Menu(links, E);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_the_menu_When_it_has_no_links()
    {
        // Arrange
        // Act
        static object Act() => new Menu([], W);

        // Assert
        Assert.Throws<DomainException>(Act);
    }
}
