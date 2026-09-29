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
        job.SetCipherText(Letters("ABCDEF"));
        job.SetCrib(Crib.Parse("XC"));

        // Act
        void Act() => job.Place(1);

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Null(job.Placement);
    }

    [Fact]
    public void Should_clear_the_placement_and_menu_When_the_cipher_text_changes()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);

        // Act
        job.SetCipherText(Letters(BombeKeys.CarterCipher + "AB"));

        // Assert
        Assert.Null(job.Placement);
        Assert.Null(job.Menu);
        Assert.Equal(Crib.Parse(BombeKeys.CarterCrib), job.Crib);
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
        void Act() => job.SetMenu([MenuLink.Parse("SW2")], null);

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Same(menu, job.Menu);
    }

    [Theory]
    [InlineData("AB", "B")]
    [InlineData("GR", "A")]
    public void Should_default_the_input_to_A_or_B_When_no_input_is_set(string pair, string input)
    {
        // Arrange
        var job = new BombeJob();
        job.SetCipherText(Letters(pair[..1]));
        job.SetCrib(Crib.Parse(pair[1..]));
        job.Place(0);

        // Act
        job.SetMenu([new MenuLink(Letter.FromChar(pair[0]), Letter.FromChar(pair[1]), 1)], Letter.FromChar(pair[0]));

        // Assert
        Assert.Equal(Letter.FromChar(input[0]), job.Input);
    }

    [Fact]
    public void Should_use_the_chosen_settings_When_the_job_is_configured()
    {
        // Arrange
        var job = new BombeJob();

        // Act
        job.Configure(Letter.FromChar('Q'), false, ReflectorType.C, [WheelOrder.Parse("II V III")]);

        // Assert
        Assert.Equal(Letter.FromChar('Q'), job.Input);
        Assert.False(job.DiagonalBoard);
        Assert.Equal(ReflectorType.C, job.Reflector);
        Assert.Equal([WheelOrder.Parse("II V III")], job.WheelOrders);
    }

    [Fact]
    public void Should_run_every_wheel_order_with_reflector_B_and_the_diagonal_board_When_the_job_is_new()
    {
        // Arrange
        // Act
        var job = new BombeJob();

        // Assert
        Assert.Equal(336, job.WheelOrders.Count);
        Assert.Equal(ReflectorType.B, job.Reflector);
        Assert.True(job.DiagonalBoard);
    }

    [Fact]
    public void Should_reject_the_settings_When_the_reflector_is_thin()
    {
        // Arrange
        var job = new BombeJob();

        // Act
        void Act() => job.Configure(null, true, ReflectorType.BThin, WheelOrder.All);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_the_settings_When_no_wheel_order_is_chosen()
    {
        // Arrange
        var job = new BombeJob();

        // Act
        void Act() => job.Configure(null, true, ReflectorType.B, []);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    private static BombeJob CarterJob()
    {
        var job = new BombeJob();
        job.SetCipherText(Letters(BombeKeys.CarterCipher));
        job.SetCrib(Crib.Parse(BombeKeys.CarterCrib));
        return job;
    }

    private static IReadOnlyList<Letter> Letters(string text) => [.. text.Select(Letter.FromChar)];

    // Carter writes some links crib letter first; the job keeps the placement's cipher letter first.
    private static IEnumerable<(int, int, int)> Unordered(IEnumerable<MenuLink> links) => links.Select(link =>
        (link.Offset, Math.Min(link.First.Index, link.Second.Index), Math.Max(link.First.Index, link.Second.Index)));
}
