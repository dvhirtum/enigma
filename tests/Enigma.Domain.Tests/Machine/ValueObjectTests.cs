using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Machine;

public sealed class ValueObjectTests
{
    [Theory]
    [InlineData('a', 0)]
    [InlineData('Z', 25)]
    public void Should_map_to_index_When_letter_is_parsed(char value, int index)
    {
        // Arrange
        // Act
        var letter = Letter.FromChar(value);

        // Assert
        Assert.Equal(index, letter.Index);
    }

    [Theory]
    [InlineData('1')]
    [InlineData('Ä')]
    [InlineData(' ')]
    public void Should_reject_character_When_it_is_not_A_to_Z(char value)
    {
        // Arrange
        // Act
        void Act() => Letter.FromChar(value);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Theory]
    [InlineData('Z', 1, 'A')]
    [InlineData('A', -1, 'Z')]
    [InlineData('C', 53, 'D')]
    public void Should_wrap_around_When_letter_is_shifted(char start, int offset, char expected)
    {
        // Arrange
        var letter = Letter.FromChar(start);

        // Act
        var shifted = letter.Shift(offset);

        // Assert
        Assert.Equal(expected, shifted.ToChar());
    }

    [Theory]
    [InlineData("ABC")]
    [InlineData("AACDEFGHIJKLMNOPQRSTUVWXYZ")]
    [InlineData("abcdefghijklmnopqrstuvwxyz")]
    public void Should_reject_wiring_When_it_is_not_a_permutation(string mapping)
    {
        // Arrange
        // Act
        void Act() => Wiring.Parse(mapping);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_invert_forward_mapping_When_signal_runs_backward()
    {
        // Arrange
        var wiring = RotorType.I.Wiring;

        // Act
        var roundTrips = Enumerable.Range(0, Letter.Count)
            .Select(Letter.FromIndex)
            .Select(l => wiring.Backward(wiring.Forward(l)) == l);

        // Assert
        Assert.All(roundTrips, Assert.True);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(27)]
    public void Should_reject_ring_setting_When_number_is_outside_1_to_26(int number)
    {
        // Arrange
        // Act
        void Act() => RingSetting.FromNumber(number);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_print_two_digits_When_ring_setting_is_formatted()
    {
        // Arrange
        var ring = RingSetting.FromChar('E');

        // Act
        var text = ring.ToString();

        // Assert
        Assert.Equal("05", text);
    }

    [Fact]
    public void Should_reject_name_When_rotor_is_unknown()
    {
        // Arrange
        // Act
        static void Act() => RotorType.FromName("IX");

        // Assert
        Assert.Throws<DomainException>(Act);
    }
}
