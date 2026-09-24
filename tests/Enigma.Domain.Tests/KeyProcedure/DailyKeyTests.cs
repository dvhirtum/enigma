using Enigma.Domain.Machine;
using Enigma.Domain.Tests.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class DailyKeyTests
{
    [Fact]
    public void Should_decrypt_the_U264_message_When_the_machine_is_set_up_with_its_daily_key()
    {
        // Arrange
        // U-264, 19 November 1942. Message key VJNA.
        var key = Keys.Day(19, "B-thin", "Beta II IV I", "01 01 01 22", "AT BL DF GJ HM NW OP QY RZ VX");
        const string ciphertext = "NCZW VUSX PNYM INHZ XMQX SFWX WLKJ AHSH NMCO CCAK UQPM KCSM HKSE INJU SBLK IOSX CKUB HMLL";
        const string plaintext = "VONV ONJL OOKS JHFF TTTE INSE INSD REIZ WOYY QNNS NEUN INHA LTXX BEIA NGRI FFUN TERW ASSE";

        // Act
        var machine = key.SetUp();
        foreach (var (slot, position) in machine.Model.Slots.Zip("VJNA"))
        {
            machine.TurnRotor(slot, RotorPosition.FromChar(position));
        }

        var decrypted = machine.Type(ciphertext);

        // Assert
        Assert.Equal(MachineBuilder.Letters(plaintext), decrypted);
    }

    [Fact]
    public void Should_set_up_an_M3_with_all_rotors_at_A_When_the_key_has_three_rotors()
    {
        // Arrange
        var key = Keys.Day(1, "C", "III VI VIII", "01 08 13", "AN EZ");

        // Act
        var machine = key.SetUp();

        // Assert
        Assert.Equal(MachineModel.M3, machine.Model);
        Assert.Equal(ReflectorType.C, machine.Reflector.Type);
        Assert.Equal([RotorType.III, RotorType.VI, RotorType.VIII], machine.Rotors.Select(r => r.Type));
        Assert.Equal([1, 8, 13], machine.Rotors.Select(r => r.RingSetting.Number));
        Assert.Equal("AAA", machine.Positions());
        Assert.Equal(["AN", "EZ"], machine.Plugboard.Pairs.Select(p => p.ToString()));
    }

    [Theory]
    [InlineData("B", "I II", "01 01", "3 rotors (M3) or 4 (M4)")]
    [InlineData("B", "I II III", "01 01", "need 3 ring settings")]
    [InlineData("B", "I I III", "01 01 01", "rotor I appears more than once")]
    [InlineData("B-thin", "I II III", "01 01 01", "The M3 takes reflector B or C")]
    [InlineData("B-thin", "I Beta II III", "01 01 01 01", "The Greek slot takes Beta or Gamma")]
    public void Should_reject_the_key_When_it_does_not_fit_a_machine(string reflector, string rotors, string rings, string message)
    {
        // Arrange
        // Act
        void Act() => Keys.Day(4, reflector, rotors, rings);

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.StartsWith("Day 4: ", exception.Message, StringComparison.Ordinal);
        Assert.Contains(message, exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Should_reject_the_key_When_a_letter_is_in_two_plug_pairs()
    {
        // Arrange
        // Act
        void Act() => Keys.Day(2, "B", "I II III", "01 01 01", "AB BC");

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Contains("AB is already plugged in", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Should_reject_the_key_When_a_Kenngruppe_appears_twice()
    {
        // Arrange
        // Act
        void Act() => Keys.Day(2, "B", "I II III", "01 01 01", "", "ABC abc");

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(32)]
    public void Should_reject_the_key_When_the_day_is_outside_1_to_31(int day)
    {
        // Arrange
        // Act
        void Act() => Keys.Day(day, "B", "I II III", "01 01 01");

        // Assert
        Assert.Throws<DomainException>(Act);
    }
}
