using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class BombeJobTests
{
    private static readonly string[] CarterLinks =
        ["SW1", "NE2", "GE5", "GR6", "SV7", "ZR9", "HZ10", "EU11", "GR12", "AS13", "RA14", "LG15", "EV16"];

    [Fact]
    public void Should_build_the_menu_When_the_crib_is_placed()
    {
        // Arrange
        var job = CarterJob();

        // Act
        job.Place(0);

        // Assert
        Assert.Equal(0, job.Placement?.Position);
        Assert.NotNull(job.Menu);
        Assert.Equal(Menu.Build(job.Placement!).ToString(), job.Menu.ToString());
    }

    [Fact]
    public void Should_reject_the_placement_When_the_crib_crashes()
    {
        // Arrange
        var job = new BombeJob();
        job.Load(MessageSource.Pasted("ABCDEF"));
        job.SetCrib(Crib.Parse("XC"));

        // Act
        void Act()
        {
            job.Place(1);
        }

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Null(job.Placement);
    }

    [Fact]
    public void Should_clear_the_crib_placement_and_menu_When_a_message_is_loaded()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);
        var source = MessageSource.Pasted(BombeKeys.CarterCipher + "AB");

        // Act
        job.Load(source);

        // Assert
        Assert.Same(source, job.Source);
        Assert.Equal(Letters(BombeKeys.CarterCipher + "AB"), job.CipherText);
        Assert.Null(job.Crib);
        Assert.Null(job.Placement);
        Assert.Null(job.Menu);
    }

    [Fact]
    public void Should_plug_up_Carters_menu_When_its_links_are_set_by_hand()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);

        // Act
        job.SetMenu([.. CarterLinks.Select(MenuLink.Parse)], Letter.FromChar('G'));

        // Assert
        Assert.Equal(Unordered(BombeKeys.CarterMenu.Links), Unordered(job.Menu!.Links));
        Assert.Equal(Letter.FromChar('G'), job.Menu?.TestRegister);
    }

    [Fact]
    public void Should_accept_a_link_When_its_letters_are_given_the_other_way_round()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);

        // Act
        job.SetMenu([MenuLink.Parse("WS1"), MenuLink.Parse("EN2")], null);

        // Assert
        Assert.Equal("SW1 NE2", job.Menu?.ToString());
    }

    [Fact]
    public void Should_reject_the_menu_When_a_link_is_not_in_the_placement()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);
        var menu = job.Menu;

        // Act
        void Act()
        {
            job.SetMenu([MenuLink.Parse("SW2")], null);
        }

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Same(menu, job.Menu);
    }

    [Fact]
    public void Should_use_the_chosen_settings_When_the_job_is_configured()
    {
        // Arrange
        var job = new BombeJob();

        // Act
        job.Configure(false, ReflectorType.C);

        // Assert
        Assert.False(job.DiagonalBoard);
        Assert.Equal(ReflectorType.C, job.Reflector);
    }

    [Fact]
    public void Should_use_reflector_B_and_the_diagonal_board_on_an_empty_Bombe_When_the_job_is_new()
    {
        // Arrange
        // Act
        var job = new BombeJob();

        // Assert
        Assert.All(job.Machine.ChainSetups,
            chain => Assert.DoesNotContain(chain.Scramblers, scrambler => scrambler.HasCable));
        Assert.Equal(ReflectorType.B, job.Reflector);
        Assert.True(job.DiagonalBoard);
    }

    [Fact]
    public void Should_reject_the_settings_When_the_reflector_is_thin()
    {
        // Arrange
        var job = new BombeJob();

        // Act
        void Act()
        {
            job.Configure(true, ReflectorType.BThin);
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_leave_the_Bombe_as_it_is_When_the_menu_changes()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);
        job.PlugUpMenu();

        // Act
        job.SetMenu([.. CarterLinks.Take(11).Select(MenuLink.Parse)], Letter.FromChar('G'));

        // Assert
        Assert.NotSame(job.Menu, job.Machine.PluggedMenu);
        Assert.NotNull(job.Machine.PluggedMenu);
    }

    [Fact]
    public void Should_refuse_to_plug_up_When_there_is_no_menu()
    {
        // Arrange
        var job = CarterJob();

        // Act
        void Act()
        {
            job.PlugUpMenu();
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_hide_the_wheel_orders_again_When_another_message_is_loaded()
    {
        // Arrange
        var job = new BombeJob();
        job.Load(Intercepts.Find("carter-weather")!.Source);
        job.ShowWheelOrders();
        var shown = job.WheelOrdersShown;

        // Act
        job.Load(Intercepts.Find("scharnhorst-1943")!.Source);

        // Assert
        Assert.True(shown);
        Assert.False(job.WheelOrdersShown);
    }

    [Fact]
    public void Should_refuse_to_show_wheel_orders_When_the_message_is_pasted()
    {
        // Arrange
        var job = CarterJob();

        // Act
        void Act()
        {
            job.ShowWheelOrders();
        }

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.False(job.WheelOrdersShown);
    }

    [Fact]
    public void Should_refuse_to_show_crib_positions_When_the_message_is_an_intercept()
    {
        // Arrange
        var job = new BombeJob();
        job.Load(Intercepts.Find("carter-weather")!.Source);

        // Act
        void Act()
        {
            job.ShowCribPositions();
        }

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.False(job.CribPositionsShown);
    }

    private static BombeJob CarterJob()
    {
        var job = new BombeJob();
        job.Load(MessageSource.Pasted(BombeKeys.CarterCipher));
        job.SetCrib(Crib.Parse(BombeKeys.CarterCrib));
        return job;
    }

    private static IReadOnlyList<Letter> Letters(string text)
    {
        return [.. text.Select(Letter.FromChar)];
    }

    // Carter writes some links crib letter first; the job keeps the placement's cipher letter first.
    private static IEnumerable<(int, int, int)> Unordered(IEnumerable<MenuLink> links)
    {
        return links.Select(link =>
            (link.Offset, Math.Min(link.First.Index, link.Second.Index),
                Math.Max(link.First.Index, link.Second.Index)));
    }
}
