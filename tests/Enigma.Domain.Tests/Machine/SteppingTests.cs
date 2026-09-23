using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Machine;

public sealed class SteppingTests
{
    [Fact]
    public void Should_step_right_rotor_before_encrypting_When_key_is_pressed()
    {
        // Arrange
        var machine = MachineBuilder.Build(MachineModel.M3, "B", "I II III", "01 01 01", "", "AAA");

        // Act
        machine.PressKey(Letter.A);

        // Assert
        Assert.Equal("AAB", machine.Positions());
    }

    [Fact]
    public void Should_double_step_middle_rotor_When_it_reaches_its_notch()
    {
        // Arrange
        var machine = MachineBuilder.Build(MachineModel.M3, "B", "I II III", "01 01 01", "", "ADU");
        var positions = new List<string>();

        // Act
        for (var i = 0; i < 3; i++)
        {
            machine.Type("A");
            positions.Add(machine.Positions());
        }

        // Assert
        Assert.Equal(["ADV", "AEW", "BFX"], positions);
    }

    [Theory]
    [InlineData("AAZ", "ABA")]
    [InlineData("AAM", "ABN")]
    public void Should_step_middle_rotor_When_rotor_VI_passes_either_notch(string start, string expected)
    {
        // Arrange
        var machine = MachineBuilder.Build(MachineModel.M3, "B", "I II VI", "01 01 01", "", start);

        // Act
        machine.Type("A");

        // Assert
        Assert.Equal(expected, machine.Positions());
    }

    [Fact]
    public void Should_not_step_Greek_rotor_When_left_rotor_turns_over()
    {
        // Arrange
        var machine = MachineBuilder.Build(MachineModel.M4, "B-thin", "Beta I II III", "01 01 01 01", "", "AQEV");

        // Act
        machine.Type("A");

        // Assert
        Assert.Equal("ARFW", machine.Positions());
    }

    [Fact]
    public void Should_step_at_window_letter_When_rotor_has_ring_offset()
    {
        // Arrange
        var machine = MachineBuilder.Build(MachineModel.M3, "B", "I II III", "05 12 20", "", "AAV");

        // Act
        machine.Type("A");

        // Assert
        Assert.Equal("ABW", machine.Positions());
    }
}
