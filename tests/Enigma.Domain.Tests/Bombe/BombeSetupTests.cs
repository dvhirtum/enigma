using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class BombeSetupTests
{
    private static readonly Letter G = Letter.FromChar('G');
    private static readonly Letter Q = Letter.FromChar('Q');
    private static readonly DrumPosition CarterDrumLetters = DrumPosition.Parse("WPC");

    [Fact]
    public void Should_stop_at_Carters_key_When_his_menu_is_plugged_up_by_hand()
    {
        // Arrange
        // Carter's 13 links take chain 1 and the first scrambler of chain 2, joined.
        var setup = new BombeSetup();
        foreach (var (link, index) in BombeKeys.CarterMenu.Links.Select((link, index) => (link, index)))
        {
            var (chain, scrambler) = Math.DivRem(index, BombeSetup.ScramblersPerChain);
            setup.Plug(chain, scrambler, 0, link.First);
            setup.Plug(chain, scrambler, 1, link.Second);
            setup.Turn(chain, scrambler, DrumPosition.FromOffset(link.Offset));
        }

        setup.Join(0, joined: true);
        setup.PlugTestRegister(0, G);
        FitCarterDrums(setup, 0, 11);
        FitCarterDrums(setup, 1, 0);

        // Act
        var group = Assert.Single(setup.Machines(ReflectorType.B, diagonalBoard: true));

        // Assert
        Assert.Equal([0, 1], group.Group.Chains);
        Assert.Equal(WheelOrder.Parse("II V III"), group.Group.WheelOrder);
        var live = group.Machine.LiveWiresAt(CarterDrumLetters);
        Assert.NotNull(live);
        Assert.Equal(Q, BombeStop.PartnerOf(live));
    }

    [Fact]
    public void Should_plug_up_the_same_Bombe_When_the_menu_is_plugged_up()
    {
        // Arrange
        var setup = new BombeSetup();
        FitCarterDrums(setup, 0, 11);

        // Act
        setup.PlugUp(BombeKeys.CarterMenu);

        // Assert
        Assert.Equal([true, false], setup.Joins);
        Assert.Equal(G, setup.ChainSetups[0].TestRegister);
        Assert.Null(setup.ChainSetups[1].TestRegister);
        Assert.Equal(WheelOrder.Parse("II V III"), setup.ChainSetups[1].Scramblers[0].WheelOrder);
        Assert.Null(setup.ChainSetups[1].Scramblers[1].WheelOrder);
        Assert.Equal("ZZP", setup.ChainSetups[1].Scramblers[0].Start.ToString());
        Assert.Same(BombeKeys.CarterMenu, setup.PluggedMenu);
        Assert.Equal(Q, BombeStop.PartnerOf(setup.Machines(ReflectorType.B, true)[0].Machine.LiveWiresAt(CarterDrumLetters)!));
    }

    [Fact]
    public void Should_plug_up_the_menu_on_each_chain_When_it_has_up_to_12_links()
    {
        // Arrange
        var setup = new BombeSetup();
        var menu = new Menu([.. BombeKeys.CarterMenu.Links.Take(12)], G);

        // Act
        setup.PlugUp(menu);

        // Assert
        Assert.Equal([false, false], setup.Joins);
        Assert.All(setup.ChainSetups, chain => Assert.Equal(G, chain.TestRegister));
        Assert.All(setup.ChainSetups, chain => Assert.True(chain.Scramblers[11].IsCabled));
        Assert.Equal(3, setup.Groups.Count);
    }

    [Fact]
    public void Should_forget_the_plugged_menu_When_a_cable_is_changed_by_hand()
    {
        // Arrange
        var setup = new BombeSetup();
        setup.PlugUp(BombeKeys.CarterMenu);

        // Act
        setup.Plug(2, 0, 0, G);

        // Assert
        Assert.Null(setup.PluggedMenu);
    }

    [Fact]
    public void Should_fit_drums_up_to_the_drum_dropped_on_When_a_row_is_fitted()
    {
        // Arrange
        var setup = new BombeSetup();
        setup.FitRow(0, 0, 11, RotorType.II);

        // Act
        setup.FitRow(0, 0, 8, RotorType.IV);

        // Assert
        var upper = setup.ChainSetups[0].Scramblers.Select(scrambler => scrambler.Rotors[0]).ToList();
        Assert.Equal(9, upper.Count(rotor => rotor == RotorType.IV));
        Assert.Equal(3, upper.Count(rotor => rotor is null));
    }

    [Fact]
    public void Should_take_out_only_that_drum_When_a_drum_is_removed()
    {
        // Arrange
        var setup = new BombeSetup();
        FitCarterDrums(setup, 0, 11);

        // Act
        setup.RemoveDrum(0, 4, 1);

        // Assert
        Assert.Equal([RotorType.II, null, RotorType.III], setup.ChainSetups[0].Scramblers[4].Rotors);
        Assert.Equal(WheelOrder.Parse("II V III"), setup.ChainSetups[0].Scramblers[5].WheelOrder);
    }

    [Fact]
    public void Should_refuse_the_drums_When_the_rotor_is_already_in_another_row_of_the_chain()
    {
        // Arrange
        var setup = new BombeSetup();
        setup.FitRow(0, 0, 3, RotorType.II);

        // Act
        void Act() => setup.FitRow(0, 2, 11, RotorType.II);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_pass_no_current_through_a_scrambler_When_it_is_cabled_without_drums()
    {
        // Arrange
        // A single cabled scrambler without drums: the test register sees only the input wire.
        var setup = new BombeSetup();
        setup.Plug(0, 0, 0, G);
        setup.Plug(0, 0, 1, Q);
        setup.PlugTestRegister(0, G);

        // Act
        var machine = Assert.Single(setup.Machines(ReflectorType.B, diagonalBoard: false)).Machine;

        // Assert
        Assert.Equal([Letter.A], machine.LiveWiresAt(DrumPosition.ZZZ));
        Assert.Contains("Chain 1, scrambler 1 is cabled but has no drums.", setup.Warnings());
    }

    [Fact]
    public void Should_warn_When_drums_have_no_cables_and_a_chain_has_no_test_register()
    {
        // Arrange
        var setup = new BombeSetup();
        FitCarterDrums(setup, 1, 0);
        setup.Plug(2, 0, 0, G);

        // Act
        var warnings = setup.Warnings();

        // Assert
        Assert.Contains("Chain 2, scrambler 1 has drums but no cables.", warnings);
        Assert.Contains("Chain 3, scrambler 1 has only one jack cabled.", warnings);
        Assert.Contains("Chain 3 has no test register.", warnings);
    }

    [Fact]
    public void Should_group_the_scramblers_of_a_chain_When_warning_about_many()
    {
        // Arrange
        // Carter's menu plugged up with drums on chain 1 only: chain 2's cabled scrambler has none.
        var setup = new BombeSetup();
        setup.PlugUp(new Menu([.. BombeKeys.CarterMenu.Links.Take(12)], G));
        FitCarterDrums(setup, 0, 11);
        setup.RemoveDrum(0, 2, 0);
        setup.RemoveDrum(0, 3, 0);
        setup.RemoveDrum(0, 4, 0);
        setup.RemoveDrum(0, 7, 0);

        // Act
        var warnings = setup.Warnings();

        // Assert
        Assert.Contains("Chain 1, scramblers 3–5, 8 are cabled but have drums missing.", warnings);
        Assert.Contains("Chain 2, scramblers 1–12 are cabled but have no drums.", warnings);
        Assert.Contains("Chain 2 has a test register but no scrambler with cables and drums, so it stops at every position.", warnings);
    }

    [Fact]
    public void Should_refuse_a_run_When_no_test_register_is_plugged()
    {
        // Arrange
        var setup = new BombeSetup();
        FitCarterDrums(setup, 0, 11);

        // Act
        object Act() => setup.Machines(ReflectorType.B, true);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_refuse_the_test_register_When_the_chain_is_joined_to_the_one_before()
    {
        // Arrange
        var setup = new BombeSetup();
        setup.Join(0, joined: true);

        // Act
        void Act() => setup.PlugTestRegister(1, G);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Theory]
    [InlineData('A', 'B')]
    [InlineData('G', 'A')]
    public void Should_default_the_input_to_A_or_B_When_no_input_is_set(char testRegister, char input)
    {
        // Arrange
        var setup = new BombeSetup();

        // Act
        setup.PlugTestRegister(0, Letter.FromChar(testRegister));

        // Assert
        Assert.Equal(Letter.FromChar(input), setup.ChainSetups[0].Input);
    }

    private static void FitCarterDrums(BombeSetup setup, int chain, int upTo)
    {
        setup.FitRow(chain, 0, upTo, RotorType.II);
        setup.FitRow(chain, 1, upTo, RotorType.V);
        setup.FitRow(chain, 2, upTo, RotorType.III);
    }
}
