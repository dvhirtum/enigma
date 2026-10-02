using Enigma.Application.Machine;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.Machine;

public sealed class HandlerTests
{
    [Fact]
    public void Should_replace_the_machine_with_an_M4_When_M4_is_created()
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        var handler = new CreateMachineHandler(store);

        // Act
        var state = handler.Handle(new CreateMachine("M4"));

        // Assert
        Assert.Equal(MachineModel.M4, store.Machine.Model);
        Assert.Equal("M4", state.Model);
        Assert.Equal("B-thin", state.Reflector);
        Assert.Equal(["Beta", "I", "II", "III"], state.Rotors.Select(r => r.Rotor));
        Assert.Equal(["Greek", "Left", "Middle", "Right"], state.Rotors.Select(r => r.Slot));
        Assert.Equal(["IV", "V", "VI", "VII", "VIII", "Gamma"], state.RotorBox.Select(r => r.Rotor));
        Assert.All(state.RotorBox, r => Assert.Null(r.Slot));
    }

    [Fact]
    public void Should_keep_the_machine_When_the_model_is_unknown()
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        var original = store.Machine;
        var handler = new CreateMachineHandler(store);

        // Act
        void Act()
        {
            handler.Handle(new CreateMachine("M5"));
        }

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Same(original, store.Machine);
    }

    [Fact]
    public void Should_return_the_current_state_When_the_state_is_requested()
    {
        // Arrange
        var handler = new GetMachineStateHandler(new FakeMachineSessionStore());

        // Act
        var state = handler.Handle(new GetMachineState());

        // Assert
        Assert.Equal("M3", state.Model);
        Assert.Equal("B", state.Reflector);
        Assert.Equal(["I", "II", "III"], state.Rotors.Select(r => r.Rotor));
        Assert.All(state.Rotors, r => Assert.Equal(1, r.RingSetting));
        Assert.All(state.Rotors, r => Assert.Equal("A", r.Position));
        Assert.Empty(state.Plugs);
        Assert.Null(state.HeldKey);
        Assert.Null(state.LitLamp);
    }

    [Fact]
    public void Should_move_the_rotor_to_the_box_When_a_rotor_is_removed()
    {
        // Arrange
        var handler = new RemoveRotorHandler(new FakeMachineSessionStore());

        // Act
        var state = handler.Handle(new RemoveRotor("Middle"));

        // Assert
        Assert.Equal(["Left", "Right"], state.Rotors.Select(r => r.Slot));
        Assert.Contains(state.RotorBox, r => r.Rotor == "II");
    }

    [Fact]
    public void Should_insert_the_rotor_with_its_ring_When_the_ring_was_set_in_the_box()
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        new SetRingSettingHandler(store).Handle(new SetRingSetting("VIII", 13));

        // Act
        var state = new InsertRotorHandler(store).Handle(new InsertRotor("Right", "VIII"));

        // Assert
        Assert.Equal(["I", "II", "VIII"], state.Rotors.Select(r => r.Rotor));
        Assert.Equal([1, 1, 13], state.Rotors.Select(r => r.RingSetting));
        Assert.Contains(state.RotorBox, r => r.Rotor == "III");
    }

    [Theory]
    [InlineData("Upper", "IV")]
    [InlineData("Left", "IX")]
    [InlineData("Greek", "Beta")]
    public void Should_reject_the_rotor_When_slot_or_rotor_is_invalid(string slot, string rotor)
    {
        // Arrange
        var handler = new InsertRotorHandler(new FakeMachineSessionStore());

        // Act
        void Act()
        {
            handler.Handle(new InsertRotor(slot, rotor));
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Theory]
    [InlineData("IX", 1)]
    [InlineData("IV", 0)]
    [InlineData("IV", 27)]
    [InlineData("I", 5)]
    public void Should_reject_the_ring_setting_When_rotor_or_ring_is_invalid(string rotor, int ring)
    {
        // Arrange
        var handler = new SetRingSettingHandler(new FakeMachineSessionStore());

        // Act
        void Act()
        {
            handler.Handle(new SetRingSetting(rotor, ring));
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_change_the_reflector_When_reflector_C_is_set()
    {
        // Arrange
        var handler = new SetReflectorHandler(new FakeMachineSessionStore());

        // Act
        var state = handler.Handle(new SetReflector("C"));

        // Assert
        Assert.Equal("C", state.Reflector);
    }

    [Fact]
    public void Should_list_the_pair_When_a_plug_is_connected()
    {
        // Arrange
        var handler = new ConnectPlugHandler(new FakeMachineSessionStore());

        // Act
        var state = handler.Handle(new ConnectPlug("TA"));

        // Assert
        Assert.Equal(["AT"], state.Plugs);
    }

    [Fact]
    public void Should_remove_the_pair_When_one_of_its_letters_is_disconnected()
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        new ConnectPlugHandler(store).Handle(new ConnectPlug("AT"));

        // Act
        var state = new DisconnectPlugHandler(store).Handle(new DisconnectPlug("t"));

        // Assert
        Assert.Empty(state.Plugs);
    }

    [Fact]
    public void Should_list_the_new_pair_When_a_plug_is_moved()
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        new ConnectPlugHandler(store).Handle(new ConnectPlug("AT"));

        // Act
        var state = new MovePlugHandler(store).Handle(new MovePlug("a", "C"));

        // Assert
        Assert.Equal(["CT"], state.Plugs);
    }

    [Theory]
    [InlineData("right", "Q", "AAQ")]
    [InlineData("Middle", "D", "ADA")]
    [InlineData("LEFT", "z", "ZAA")]
    public void Should_show_the_letter_in_the_window_When_a_rotor_is_turned(string slot, string position,
        string expected)
    {
        // Arrange
        var handler = new TurnRotorHandler(new FakeMachineSessionStore());

        // Act
        var state = handler.Handle(new TurnRotor(slot, position));

        // Assert
        Assert.Equal(expected, string.Concat(state.Rotors.Select(r => r.Position)));
    }

    [Theory]
    [InlineData("Greek", "A")]
    [InlineData("Top", "A")]
    [InlineData("Right", "AB")]
    [InlineData("Right", "1")]
    [InlineData("Right", "")]
    public void Should_reject_the_turn_When_slot_or_position_is_invalid(string slot, string position)
    {
        // Arrange
        var handler = new TurnRotorHandler(new FakeMachineSessionStore());

        // Act
        void Act()
        {
            handler.Handle(new TurnRotor(slot, position));
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_return_the_lamp_and_new_positions_When_a_key_is_pressed()
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        var handler = new PressKeyHandler(store);

        // Act
        var state = handler.Handle(new PressKey("A"));

        // Assert
        Assert.Equal("A", state.HeldKey);
        Assert.Equal("B", state.LitLamp);
        Assert.Equal("AAB", string.Concat(state.Rotors.Select(r => r.Position)));
        Assert.Empty(store.Machine.DomainEvents);
    }

    [Fact]
    public void Should_turn_off_the_lamp_When_the_key_is_released()
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        new PressKeyHandler(store).Handle(new PressKey("A"));

        // Act
        var state = new ReleaseKeyHandler(store).Handle(new ReleaseKey());

        // Assert
        Assert.Null(state.HeldKey);
        Assert.Null(state.LitLamp);
    }

    [Fact]
    public void Should_write_down_every_lamp_and_keep_them_When_the_machine_is_set_up_anew()
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        var press = new PressKeyHandler(store);
        var release = new ReleaseKeyHandler(store);
        foreach (var key in "AAA")
        {
            press.Handle(new PressKey(key.ToString()));
            release.Handle(new ReleaseKey());
        }

        // Act
        var state = new CreateMachineHandler(store).Handle(new CreateMachine("M3"));

        // Assert
        Assert.Equal("BDZ", state.Lamps);
    }

    [Fact]
    public void Should_clear_the_lamps_written_down_When_asked()
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        new PressKeyHandler(store).Handle(new PressKey("A"));
        new ReleaseKeyHandler(store).Handle(new ReleaseKey());

        // Act
        var state = new ClearLampsHandler(store).Handle(new ClearLamps());

        // Assert
        Assert.Equal("", state.Lamps);
    }

    [Fact]
    public void Should_decrypt_the_Scharnhorst_message_When_the_machine_is_set_up_through_handlers()
    {
        // Arrange
        // Schlachtschiff Scharnhorst, 26 December 1943.
        var store = new FakeMachineSessionStore();
        new RemoveRotorHandler(store).Handle(new RemoveRotor("Right"));
        new SetRingSettingHandler(store).Handle(new SetRingSetting("VI", 8));
        new SetRingSettingHandler(store).Handle(new SetRingSetting("VIII", 13));
        new InsertRotorHandler(store).Handle(new InsertRotor("Left", "III"));
        new InsertRotorHandler(store).Handle(new InsertRotor("Middle", "VI"));
        new InsertRotorHandler(store).Handle(new InsertRotor("Right", "VIII"));
        foreach (var pair in "AN EZ HK IJ LR MQ OT PV SW UX".Split(' '))
            new ConnectPlugHandler(store).Handle(new ConnectPlug(pair));

        new TurnRotorHandler(store).Handle(new TurnRotor("Left", "U"));
        new TurnRotorHandler(store).Handle(new TurnRotor("Middle", "Z"));
        new TurnRotorHandler(store).Handle(new TurnRotor("Right", "V"));
        var press = new PressKeyHandler(store);
        var release = new ReleaseKeyHandler(store);

        // Act
        var plaintext = string.Concat("YKAENZAPMSCHZBFOCUVMRMDPYCOFHADZIZMEFXTHFLOLPZLFGGBOTGOXGRETDWTJIQHLMXVJWKZUASTR"
            .Select(c =>
            {
                var lamp = press.Handle(new PressKey(c.ToString())).LitLamp;
                release.Handle(new ReleaseKey());
                return lamp;
            }));

        // Assert
        Assert.Equal("STEUEREJTANAFJORDJANSTANDORTQUAAACCCVIERNEUNNEUNZWOFAHRTZWONULSMXXSCHARNHORSTHCO", plaintext);
    }

    [Fact]
    public void Should_decrypt_Scharnhorsts_signal_When_the_whole_key_is_set_up_in_one_call()
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        var press = new PressKeyHandler(store);
        var release = new ReleaseKeyHandler(store);

        // Act
        var state = new SetUpMachineHandler(store).Handle(new SetUpMachine(
            "B", ["III", "VI", "VIII"], [1, 8, 13], "AN EZ HK IJ LR MQ OT PV SW UX".Split(' '), "UZV"));
        var plaintext = string.Concat("YKAENZAPMSCHZBFOCUVMRMDPYCOFHADZIZMEFXTHFLOLPZLFGGBOTGOXGRETDWTJIQHLMXVJWKZUASTR"
            .Select(c =>
            {
                var lamp = press.Handle(new PressKey(c.ToString())).LitLamp;
                release.Handle(new ReleaseKey());
                return lamp;
            }));

        // Assert
        Assert.Equal("M3", state.Model);
        Assert.Equal(10, state.Plugs.Count);
        Assert.Equal("STEUEREJTANAFJORDJANSTANDORTQUAAACCCVIERNEUNNEUNZWOFAHRTZWONULSMXXSCHARNHORSTHCO", plaintext);
    }

    [Theory]
    [InlineData("B", new[] { "I", "II" }, new[] { 1, 1 }, "AA")]
    [InlineData("B", new[] { "I", "II", "III" }, new[] { 1, 1 }, "AAA")]
    [InlineData("B", new[] { "I", "II", "III" }, new[] { 1, 1, 1 }, "AA")]
    [InlineData("B", new[] { "I", "I", "III" }, new[] { 1, 1, 1 }, "AAA")]
    public void Should_keep_the_machine_When_the_key_is_not_complete(string reflector, string[] rotors, int[] rings,
        string positions)
    {
        // Arrange
        var store = new FakeMachineSessionStore();
        var original = store.Machine;

        // Act
        void Act()
        {
            new SetUpMachineHandler(store).Handle(new SetUpMachine(reflector, rotors, rings, [], positions));
        }

        // Assert
        Assert.ThrowsAny<DomainException>(Act);
        Assert.Same(original, store.Machine);
    }
}
