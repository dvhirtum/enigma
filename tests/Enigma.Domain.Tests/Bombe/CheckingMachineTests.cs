using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class CheckingMachineTests
{
    private static readonly Letter G = Letter.FromChar('G');
    private static readonly Letter Q = Letter.FromChar('Q');

    [Fact]
    public void Should_show_the_stops_drum_letters_When_set_up_for_a_stop()
    {
        // Arrange
        var checker = new CheckingMachine();

        // Act
        checker.SetUp(4, CarterStop(), ReflectorType.B);

        // Assert
        Assert.Equal(WheelOrder.Parse("II V III"), checker.WheelOrder);
        Assert.Equal("ZZZ", checker.Windows.ToString());
        Assert.Equal("DKX", checker.Rings.ToString());
        Assert.Equal("WPC", checker.DrumLetters.ToString());
        Assert.Equal(4, checker.Stop);
    }

    [Fact]
    public void Should_light_the_partner_of_the_other_letter_When_set_to_a_link()
    {
        // Arrange
        // Link G–R at offset 6: with G/Q, Q on the machine at ZZF lights R's partner, R itself.
        var checker = new CheckingMachine();
        checker.SetUp(0, CarterStop(), ReflectorType.B);
        checker.Windows = DrumPosition.Parse("ZZF");

        // Act
        var lamp = checker.Press(Q);

        // Assert
        Assert.Equal(Letter.FromChar('R'), lamp);
    }

    [Theory]
    [InlineData("ZZE", 'D', 'P')]
    [InlineData("ZZK", 'P', 'W')]
    public void Should_light_the_Virtual_Colossus_lamps_When_the_SNY_stop_is_followed_by_hand(string windows, char key, char lamp)
    {
        // Arrange
        // bombe.virtualcolossus.co.uk/simulation.html: the stop SNY with G/D, rings SNY, links G–E at ZZE and E–U at ZZK.
        var checker = new CheckingMachine();
        checker.Fit([RotorType.II, RotorType.V, RotorType.III]);
        (checker.Rings, checker.Windows) = (DrumPosition.Parse("SNY"), DrumPosition.Parse(windows));

        // Act
        var lit = checker.Press(Letter.FromChar(key));

        // Assert
        Assert.Equal(Letter.FromChar(lamp), lit);
    }

    [Fact]
    public void Should_press_at_the_same_drum_letters_When_the_rings_and_windows_turn_together()
    {
        // Arrange
        var checker = new CheckingMachine();
        checker.SetUp(0, CarterStop(), ReflectorType.B);
        var atStop = checker.Press(Q);

        // Act
        (checker.Rings, checker.Windows) = (DrumPosition.Parse("EKY"), DrumPosition.Parse("AZA"));

        // Assert
        Assert.Equal("WPC", checker.DrumLetters.ToString());
        Assert.Equal(atStop, checker.Press(Q));
    }

    [Fact]
    public void Should_forget_the_stop_When_the_drums_are_changed_by_hand()
    {
        // Arrange
        var checker = new CheckingMachine();
        checker.SetUp(2, CarterStop(), ReflectorType.B);

        // Act
        checker.Fit([RotorType.II, null, RotorType.III]);

        // Assert
        Assert.Null(checker.Stop);
        Assert.Null(checker.WheelOrder);
    }

    [Fact]
    public void Should_refuse_a_key_When_a_drum_is_missing()
    {
        // Arrange
        var checker = new CheckingMachine();
        checker.Fit([RotorType.II, null, RotorType.III]);

        // Act
        void Act() => checker.Press(Q);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_refuse_the_drums_When_a_rotor_is_fitted_twice()
    {
        // Arrange
        var checker = new CheckingMachine();

        // Act
        void Act() => checker.Fit([RotorType.II, RotorType.II, RotorType.III]);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_have_the_dummy_drum_and_reflector_B_When_new()
    {
        // Arrange
        // Act
        var checker = new CheckingMachine();

        // Assert
        Assert.True(checker.Dummy);
        Assert.Equal(ReflectorType.B, checker.Reflector);
    }

    [Fact]
    public void Should_refuse_a_key_When_the_dummy_drum_is_taken_out()
    {
        // Arrange
        var checker = new CheckingMachine();
        checker.SetUp(0, CarterStop(), ReflectorType.B);

        // Act
        checker.FitDummy(false);
        void Act() => checker.Press(Q);

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Null(checker.Stop);
    }

    [Fact]
    public void Should_refuse_a_key_When_the_reflector_is_taken_out()
    {
        // Arrange
        var checker = new CheckingMachine();
        checker.SetUp(0, CarterStop(), ReflectorType.B);

        // Act
        checker.SetReflector(null);
        void Act() => checker.Press(Q);

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Null(checker.Stop);
    }

    [Fact]
    public void Should_light_the_lamp_of_the_thin_reflector_When_a_thin_cartridge_is_fitted()
    {
        // Arrange
        var checker = new CheckingMachine();
        checker.SetUp(0, CarterStop(), ReflectorType.B);
        var core = checker.CorePositions!.Value;

        // Act
        checker.SetReflector(ReflectorType.BThin);
        var lamp = checker.Press(Q);

        // Assert
        Assert.Equal(Scrambler.Encipher(checker.WheelOrder!, ReflectorType.BThin, core, Q), lamp);
        Assert.NotEqual(Scrambler.Encipher(checker.WheelOrder!, ReflectorType.B, core, Q), lamp);
    }

    [Fact]
    public void Should_fit_the_dummy_drum_When_set_up_for_a_stop()
    {
        // Arrange
        var checker = new CheckingMachine();
        checker.FitDummy(false);
        checker.SetReflector(null);

        // Act
        checker.SetUp(0, CarterStop(), ReflectorType.C);

        // Assert
        Assert.True(checker.Dummy);
        Assert.Equal(ReflectorType.C, checker.Reflector);
    }

    private static BombeStop CarterStop() => new(WheelOrder.Parse("II V III"), DrumPosition.Parse("VMB"), G, [Q]);
}
