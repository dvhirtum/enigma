using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class DrumPositionTests
{
    [Theory]
    [InlineData(0, "ZZZ")]
    [InlineData(1, "ZZA")]
    [InlineData(2, "ZZB")]
    [InlineData(25, "ZZY")]
    [InlineData(26, "ZAZ")]
    [InlineData(27, "ZAA")]
    [InlineData(51, "ZAY")]
    public void Should_count_offsets_from_ZZZ_as_on_Bombe_menus_When_advanced(int offset, string expected)
    {
        // Arrange
        var position = DrumPosition.ZZZ;

        // Act
        var advanced = position.Advance(offset);

        // Assert
        Assert.Equal(expected, advanced.ToString());
        Assert.Equal(offset, advanced.Offset);
    }

    [Theory]
    [InlineData("AAY", 3, "AAB")]
    [InlineData("KXQ", 26, "KYQ")]
    [InlineData("YYY", 1, "YYZ")]
    public void Should_turn_each_drum_on_its_own_When_advanced(string start, int offset, string expected)
    {
        // Arrange
        var position = DrumPosition.Parse(start);

        // Act
        var advanced = position.Advance(offset);

        // Assert
        Assert.Equal(expected, advanced.ToString());
    }

    [Theory]
    [InlineData("ZZZ", "AAA")]
    [InlineData("AAA", "ZZZ")]
    [InlineData("VMB", "ENY")]
    public void Should_read_the_reversed_letters_When_shown_on_the_indicator_drums(string core, string indicator)
    {
        // Arrange
        var position = DrumPosition.Parse(core);

        // Act
        var reading = position.Indicator;

        // Assert
        Assert.Equal(indicator, reading.ToString());
    }

    [Theory]
    [InlineData("ZZ")]
    [InlineData("ZZZZ")]
    [InlineData("Z1Z")]
    public void Should_reject_the_letters_When_they_are_not_a_drum_position(string letters)
    {
        // Arrange
        // Act
        void Act()
        {
            DrumPosition.Parse(letters);
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }
}
