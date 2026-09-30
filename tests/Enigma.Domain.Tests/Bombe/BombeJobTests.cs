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
        void Act() => job.Place(1);

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
        job.Load(MessageSource.Pasted(pair[..1]));
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
        job.Configure(Letter.FromChar('Q'), false, ReflectorType.C);

        // Assert
        Assert.Equal(Letter.FromChar('Q'), job.Input);
        Assert.False(job.DiagonalBoard);
        Assert.Equal(ReflectorType.C, job.Reflector);
    }

    [Fact]
    public void Should_use_reflector_B_and_the_diagonal_board_without_copies_When_the_job_is_new()
    {
        // Arrange
        // Act
        var job = new BombeJob();

        // Assert
        Assert.Empty(job.Copies);
        Assert.Equal(ReflectorType.B, job.Reflector);
        Assert.True(job.DiagonalBoard);
    }

    [Fact]
    public void Should_reject_the_settings_When_the_reflector_is_thin()
    {
        // Arrange
        var job = new BombeJob();

        // Act
        void Act() => job.Configure(null, true, ReflectorType.BThin);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_plug_up_three_empty_copies_at_the_link_offsets_When_the_menu_fits_on_one_chain()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);

        // Act
        job.SetMenu([.. CarterLinks.Take(12).Select(MenuLink.Parse)], Letter.FromChar('G'));

        // Assert
        Assert.Equal(3, job.Copies.Count);
        Assert.All(job.Copies, copy => Assert.True(copy.IsEmpty));
        Assert.Equal(["ZZA", "ZZB", "ZZE"], job.Copies[2].Starts.Take(3).Select(start => start.ToString()));
    }

    [Fact]
    public void Should_plug_up_one_copy_When_the_menu_needs_two_chains()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);

        // Act
        job.SetMenu([.. CarterLinks.Select(MenuLink.Parse)], Letter.FromChar('G'));

        // Assert
        Assert.Equal(2, job.Menu!.ChainsPerCopy);
        var copy = Assert.Single(job.Copies);
        Assert.Equal(13, copy.Starts.Count);
    }

    [Fact]
    public void Should_keep_the_drums_and_reset_the_start_letters_When_the_menu_changes()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);
        job.SetMenu([.. CarterLinks.Take(12).Select(MenuLink.Parse)], Letter.FromChar('G'));
        FitCarterDrums(job, 1);
        job.TurnScrambler(1, 0, DrumPosition.Parse("ABC"));

        // Act
        job.SetMenu([.. CarterLinks.Take(11).Select(MenuLink.Parse)], Letter.FromChar('G'));

        // Assert
        Assert.Equal(WheelOrder.Parse("II V III"), job.Copies[1].WheelOrder);
        Assert.Equal("ZZA", job.Copies[1].Starts[0].ToString());
    }

    [Fact]
    public void Should_run_only_the_copies_with_drums_When_the_others_are_empty()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);
        job.SetMenu([.. CarterLinks.Take(12).Select(MenuLink.Parse)], Letter.FromChar('G'));

        // Act
        FitCarterDrums(job, 2);

        // Assert
        Assert.Same(job.Copies[2], Assert.Single(job.FittedCopies()));
    }

    [Fact]
    public void Should_refuse_a_run_When_a_copy_has_drums_in_only_some_rows()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);
        job.FitDrums(0, 0, RotorType.II);

        // Act
        object Act() => job.FittedCopies();

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_refuse_a_run_When_no_copy_has_drums()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);

        // Act
        object Act() => job.FittedCopies();

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_refuse_the_drums_When_the_rotor_is_already_in_another_row()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);
        job.FitDrums(0, 0, RotorType.II);

        // Act
        void Act() => job.FitDrums(0, 2, RotorType.II);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_take_the_drums_out_When_no_rotor_is_given()
    {
        // Arrange
        var job = CarterJob();
        job.Place(0);
        FitCarterDrums(job, 0);

        // Act
        job.FitDrums(0, 1, null);

        // Assert
        Assert.Equal([RotorType.II, null, RotorType.III], job.Copies[0].Drums);
        Assert.Null(job.Copies[0].WheelOrder);
    }

    private static void FitCarterDrums(BombeJob job, int copy)
    {
        job.FitDrums(copy, 0, RotorType.II);
        job.FitDrums(copy, 1, RotorType.V);
        job.FitDrums(copy, 2, RotorType.III);
    }

    private static BombeJob CarterJob()
    {
        var job = new BombeJob();
        job.Load(MessageSource.Pasted(BombeKeys.CarterCipher));
        job.SetCrib(Crib.Parse(BombeKeys.CarterCrib));
        return job;
    }

    private static IReadOnlyList<Letter> Letters(string text) => [.. text.Select(Letter.FromChar)];

    // Carter writes some links crib letter first; the job keeps the placement's cipher letter first.
    private static IEnumerable<(int, int, int)> Unordered(IEnumerable<MenuLink> links) => links.Select(link =>
        (link.Offset, Math.Min(link.First.Index, link.Second.Index), Math.Max(link.First.Index, link.Second.Index)));
}
