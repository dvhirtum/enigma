using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Machine;

public sealed class EncryptionTests
{
    private const string Text = "DASOBERKOMMANDODERWEHRMACHTGIBTBEKANNTXAACHENXAACHENXISTGERETTET";

    [Theory]
    [InlineData("B-thin", "Beta", "B")]
    [InlineData("C-thin", "Gamma", "C")]
    public void Should_match_M3_When_M4_has_thin_reflector_and_Greek_rotor_at_A(
        string thinReflector, string greekRotor, string reflector)
    {
        // Arrange
        var m4 = MachineBuilder.Build(
            MachineModel.M4, thinReflector, $"{greekRotor} V VII II", "01 07 14 26", "AQ BW CE", "AMRZ");
        var m3 = MachineBuilder.Build(MachineModel.M3, reflector, "V VII II", "07 14 26", "AQ BW CE", "MRZ");

        // Act
        var m4Ciphertext = m4.Type(Text);
        var m3Ciphertext = m3.Type(Text);

        // Assert
        Assert.Equal(m3Ciphertext, m4Ciphertext);
    }

    [Fact]
    public void Should_restore_plaintext_When_ciphertext_is_typed_with_same_settings()
    {
        // Arrange
        var encryptor = MachineBuilder.Build(
            MachineModel.M4, "C-thin", "Gamma VIII VI VII", "03 14 15 09", "AZ BY CX DW", "QEVJ");
        var decryptor = MachineBuilder.Build(
            MachineModel.M4, "C-thin", "Gamma VIII VI VII", "03 14 15 09", "AZ BY CX DW", "QEVJ");
        var ciphertext = encryptor.Type(Text);

        // Act
        var plaintext = decryptor.Type(ciphertext);

        // Assert
        Assert.Equal(Text, plaintext);
    }

    [Fact]
    public void Should_never_light_pressed_key_When_typing()
    {
        // Arrange
        var machine = MachineBuilder.Build(MachineModel.M3, "C", "IV VII III", "11 02 25", "KL MN", "XYZ");
        var keys = string.Concat(Enumerable.Repeat("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 40));

        // Act
        var lamps = machine.Type(keys);

        // Assert
        Assert.All(keys.Zip(lamps), pair => Assert.NotEqual(pair.First, pair.Second));
    }

    [Fact]
    public void Should_be_involutions_When_reflectors_are_catalogued()
    {
        // Arrange
        var reflectors = ReflectorType.All;

        // Act
        var reflections = reflectors.Select(r => r.Wiring.IsReflection);

        // Assert
        Assert.All(reflections, Assert.True);
    }
}
