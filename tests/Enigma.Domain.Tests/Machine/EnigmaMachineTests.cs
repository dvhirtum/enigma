using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Machine;

public sealed class EnigmaMachineTests
{
    [Fact]
    public void Should_have_rotors_I_II_III_and_reflector_B_When_M3_is_created()
    {
        // Arrange
        var model = MachineModel.M3;

        // Act
        var machine = EnigmaMachine.Create(model);

        // Assert
        Assert.Equal([RotorType.I, RotorType.II, RotorType.III], machine.Rotors.Select(r => r.Type));
        Assert.Equal(ReflectorType.B, machine.Reflector.Type);
        Assert.All(machine.Rotors, r => Assert.Equal(RingSetting.A, r.RingSetting));
        Assert.Equal("AAA", machine.Positions());
        Assert.Empty(machine.Plugboard.Pairs);
    }

    [Fact]
    public void Should_have_Beta_I_II_III_and_reflector_B_thin_When_M4_is_created()
    {
        // Arrange
        var model = MachineModel.M4;

        // Act
        var machine = EnigmaMachine.Create(model);

        // Assert
        Assert.Equal([RotorType.Beta, RotorType.I, RotorType.II, RotorType.III], machine.Rotors.Select(r => r.Type));
        Assert.Equal(ReflectorType.BThin, machine.Reflector.Type);
        Assert.Equal("AAAA", machine.Positions());
    }

    [Theory]
    [InlineData("M3", "Greek", "Beta")]
    [InlineData("M3", "Left", "Beta")]
    [InlineData("M4", "Greek", "IV")]
    [InlineData("M4", "Left", "Gamma")]
    public void Should_reject_rotor_When_it_does_not_fit_the_slot(string model, string slot, string rotor)
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.FromName(model));

        // Act
        void Act() => machine.InsertRotor(Enum.Parse<RotorSlot>(slot), RotorType.FromName(rotor));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_rotor_When_it_is_already_in_another_slot()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);

        // Act
        var exception = Assert.Throws<DomainException>(() => machine.InsertRotor(RotorSlot.Right, RotorType.I));

        // Assert
        Assert.Equal("Rotor I is already in the Left slot.", exception.Message);
        Assert.Equal([RotorType.I, RotorType.II, RotorType.III], machine.Rotors.Select(r => r.Type));
    }

    [Theory]
    [InlineData("M3", "IV V VI VII VIII")]
    [InlineData("M4", "IV V VI VII VIII Gamma")]
    public void Should_keep_unused_rotors_in_box_When_machine_is_created(string model, string expected)
    {
        // Arrange
        var machineModel = MachineModel.FromName(model);

        // Act
        var machine = EnigmaMachine.Create(machineModel);

        // Assert
        Assert.Equal(expected, string.Join(' ', machine.RotorBox.Select(r => r.Type.Name)));
    }

    [Fact]
    public void Should_return_the_rotor_in_the_slot_to_the_box_When_another_rotor_is_inserted()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);

        // Act
        machine.InsertRotor(RotorSlot.Middle, RotorType.VIII);

        // Assert
        Assert.Equal([RotorType.I, RotorType.VIII, RotorType.III], machine.Rotors.Select(r => r.Type));
        Assert.Equal("II IV V VI VII", string.Join(' ', machine.RotorBox.Select(r => r.Type.Name)));
    }

    [Fact]
    public void Should_keep_ring_and_position_When_rotor_is_reinserted()
    {
        // Arrange
        var machine = MachineBuilder.Build(MachineModel.M3, "B", "I II III", "05 06 07", "", "XYZ");
        machine.RemoveRotor(RotorSlot.Left);
        machine.RemoveRotor(RotorSlot.Right);

        // Act
        machine.InsertRotor(RotorSlot.Left, RotorType.III);
        machine.InsertRotor(RotorSlot.Right, RotorType.I);

        // Assert
        Assert.Equal("07 06 05", string.Join(' ', machine.Rotors.Select(r => r.RingSetting)));
        Assert.Equal("ZYX", machine.Positions());
    }

    [Fact]
    public void Should_empty_only_that_slot_When_a_rotor_is_removed()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M4);

        // Act
        machine.RemoveRotor(RotorSlot.Middle);

        // Assert
        Assert.Null(machine.RotorIn(RotorSlot.Middle));
        Assert.Equal([RotorType.Beta, RotorType.I, RotorType.III], machine.Rotors.Select(r => r.Type));
        Assert.Contains(machine.RotorBox, r => r.Type == RotorType.II);
        Assert.False(machine.IsComplete);
    }

    [Fact]
    public void Should_reject_removal_When_the_slot_is_empty()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);
        machine.RemoveRotor(RotorSlot.Right);

        // Act
        void Act() => machine.RemoveRotor(RotorSlot.Right);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_turning_When_the_slot_is_empty()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);
        machine.RemoveRotor(RotorSlot.Right);

        // Act
        void Act() => machine.TurnRotor(RotorSlot.Right, RotorPosition.FromChar('Q'));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_key_When_a_slot_is_empty()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);
        machine.RemoveRotor(RotorSlot.Middle);

        // Act
        void Act() => machine.PressKey(Letter.A);

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Null(machine.HeldKey);
    }

    [Fact]
    public void Should_reject_ring_setting_When_rotor_is_inserted()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);

        // Act
        void Act() => machine.SetRingSetting(RotorType.II, RingSetting.FromNumber(5));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_ring_setting_When_rotor_does_not_belong_to_model()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);

        // Act
        void Act() => machine.SetRingSetting(RotorType.Gamma, RingSetting.FromNumber(5));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Theory]
    [InlineData("M3", "B-thin")]
    [InlineData("M3", "C-thin")]
    [InlineData("M4", "B")]
    [InlineData("M4", "C")]
    public void Should_reject_reflector_When_it_does_not_fit_model(string model, string reflector)
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.FromName(model));

        // Act
        void Act() => machine.SetReflector(ReflectorType.FromName(reflector));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_Greek_slot_When_model_is_M3()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);

        // Act
        void Act() => machine.TurnRotor(RotorSlot.Greek, RotorPosition.A);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_set_ring_of_Greek_rotor_When_it_is_in_the_box()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M4);

        // Act
        machine.SetRingSetting(RotorType.Gamma, RingSetting.FromNumber(17));

        // Assert
        Assert.Equal(17, machine.RotorBox.Single(r => r.Type == RotorType.Gamma).RingSetting.Number);
    }

    [Fact]
    public void Should_show_position_in_window_When_rotor_is_turned()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);

        // Act
        machine.TurnRotor(RotorSlot.Middle, RotorPosition.FromChar('Q'));

        // Assert
        Assert.Equal("AQA", machine.Positions());
    }

    [Fact]
    public void Should_light_lamp_and_hold_key_When_key_is_pressed()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);

        // Act
        var lamp = machine.PressKey(Letter.A);

        // Assert
        Assert.Equal(Letter.FromChar('B'), lamp);
        Assert.Equal(Letter.A, machine.HeldKey);
        Assert.Equal(lamp, machine.LitLamp);
    }

    [Fact]
    public void Should_reject_key_When_another_key_is_held_down()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);
        machine.PressKey(Letter.A);

        // Act
        void Act() => machine.PressKey(Letter.FromChar('B'));

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Equal("AAB", machine.Positions());
    }

    [Theory]
    [InlineData("InsertRotor")]
    [InlineData("RemoveRotor")]
    [InlineData("SetReflector")]
    [InlineData("SetRingSetting")]
    [InlineData("TurnRotor")]
    [InlineData("ConnectPlug")]
    [InlineData("DisconnectPlug")]
    [InlineData("MovePlug")]
    public void Should_reject_the_change_and_keep_the_machine_When_a_key_is_held_down(string operation)
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);
        machine.ConnectPlug(PlugPair.Parse("QW"));
        machine.PressKey(Letter.A);
        Action act = operation switch
        {
            "InsertRotor" => () => machine.InsertRotor(RotorSlot.Left, RotorType.V),
            "RemoveRotor" => () => machine.RemoveRotor(RotorSlot.Left),
            "SetReflector" => () => machine.SetReflector(ReflectorType.C),
            "SetRingSetting" => () => machine.SetRingSetting(RotorType.IV, RingSetting.FromNumber(5)),
            "TurnRotor" => () => machine.TurnRotor(RotorSlot.Right, RotorPosition.FromChar('Q')),
            "ConnectPlug" => () => machine.ConnectPlug(PlugPair.Parse("AT")),
            "DisconnectPlug" => () => machine.DisconnectPlug(Letter.FromChar('Q')),
            _ => () => machine.MovePlug(Letter.FromChar('Q'), Letter.FromChar('T')),
        };

        // Act
        var exception = Assert.Throws<DomainException>(act);

        // Assert
        Assert.Equal("Key A is still held down.", exception.Message);
        Assert.Equal([RotorType.I, RotorType.II, RotorType.III], machine.Rotors.Select(r => r.Type));
        Assert.Equal("AAB", machine.Positions());
        Assert.Equal(ReflectorType.B, machine.Reflector.Type);
        Assert.Equal(RingSetting.A, machine.RotorBox.Single(r => r.Type == RotorType.IV).RingSetting);
        Assert.Equal([PlugPair.Parse("QW")], machine.Plugboard.Pairs);
        Assert.Equal(Letter.A, machine.HeldKey);
    }

    [Fact]
    public void Should_allow_changes_again_When_the_key_is_released()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);
        machine.PressKey(Letter.A);
        machine.ReleaseKey();

        // Act
        machine.TurnRotor(RotorSlot.Right, RotorPosition.FromChar('Q'));

        // Assert
        Assert.Equal("AAQ", machine.Positions());
    }

    [Fact]
    public void Should_turn_lamp_off_When_key_is_released()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);
        machine.PressKey(Letter.A);

        // Act
        machine.ReleaseKey();

        // Assert
        Assert.Null(machine.HeldKey);
        Assert.Null(machine.LitLamp);
    }

    [Fact]
    public void Should_reject_release_When_no_key_is_held_down()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);

        // Act
        void Act() => machine.ReleaseKey();

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_raise_RotorsStepped_and_LampLit_When_key_is_pressed()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);

        // Act
        machine.PressKey(Letter.A);

        // Assert
        Assert.Collection(
            machine.DomainEvents,
            e => Assert.Equal("AAB", string.Concat(Assert.IsType<RotorsStepped>(e).Positions)),
            e => Assert.Equal(Letter.FromChar('B'), Assert.IsType<LampLit>(e).Lamp));
    }

    [Fact]
    public void Should_have_no_events_When_events_are_cleared()
    {
        // Arrange
        var machine = EnigmaMachine.Create(MachineModel.M3);
        machine.PressKey(Letter.A);

        // Act
        machine.ClearDomainEvents();

        // Assert
        Assert.Empty(machine.DomainEvents);
    }
}
