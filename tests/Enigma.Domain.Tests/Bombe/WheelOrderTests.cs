using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class WheelOrderTests
{
    [Fact]
    public void Should_list_336_distinct_wheel_orders_When_all_are_requested()
    {
        // Arrange
        var all = WheelOrder.All;

        // Act
        var distinct = all.Select(order => order.ToString()).Distinct().Count();

        // Assert
        Assert.Equal(336, all.Count);
        Assert.Equal(336, distinct);
    }

    [Theory]
    [InlineData("I II III", "ZZZ", "AAA")]
    [InlineData("VI VII VIII", "ZZZ", "AAA")]
    [InlineData("IV V I", "ZZZ", "BCA")]
    [InlineData("II V III", "VMB", "WPC")]
    public void Should_show_letters_ahead_of_the_Enigma_rotors_When_read_on_the_drums(string rotors,
        string corePositions, string letters)
    {
        // Arrange
        var order = WheelOrder.Parse(rotors);
        var core = DrumPosition.Parse(corePositions);

        // Act
        var drums = order.DrumLetters(core);

        // Assert
        Assert.Equal(letters, drums.ToString());
    }

    [Fact]
    public void Should_read_the_rotors_from_left_to_right_When_parsed()
    {
        // Arrange
        const string rotors = "II V III";

        // Act
        var order = WheelOrder.Parse(rotors);

        // Assert
        Assert.Equal((RotorType.II, RotorType.V, RotorType.III), (order.Left, order.Middle, order.Right));
        Assert.Equal(rotors, order.ToString());
    }

    [Theory]
    [InlineData("I I II")]
    [InlineData("Beta I II")]
    [InlineData("I II")]
    public void Should_reject_the_wheel_order_When_it_is_not_three_distinct_rotors_I_to_VIII(string rotors)
    {
        // Arrange
        // Act
        void Act()
        {
            WheelOrder.Parse(rotors);
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public void Should_give_the_key_and_two_other_allowed_wheel_orders_When_a_hint_is_drawn(int seed)
    {
        // Arrange
        var key = WheelOrder.Parse("II V III");

        static bool Fits(WheelOrder order)
        {
            return order.Right.Notches.Count == 1;
        }

        // Act
        var hint = WheelOrder.Hint(key, Fits, new Random(seed));

        // Assert
        Assert.Equal(3, hint.Distinct().Count());
        Assert.Contains(key, hint);
        Assert.All(hint, order => Assert.True(Fits(order)));
    }
}
