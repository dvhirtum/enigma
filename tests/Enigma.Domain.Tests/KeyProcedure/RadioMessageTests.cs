using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class RadioMessageTests
{
    [Fact]
    public void Should_write_the_preamble_and_repeat_the_indicator_When_a_message_is_created()
    {
        // Arrange
        var indicator = new IndicatorGroups("QWER", "TZUI");

        // Act
        var message = RadioMessage.Create(new TimeOnly(18, 40), indicator, "ABCDEFGH");

        // Assert
        Assert.Equal(24, message.LetterCount);
        Assert.Equal("1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI", message.ToString());
    }

    [Fact]
    public void Should_reject_the_message_When_the_last_group_is_short()
    {
        // Arrange
        var indicator = new IndicatorGroups("QWER", "TZUI");

        // Act
        void Act() => RadioMessage.Create(new TimeOnly(18, 40), indicator, "ABCDEF");

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Theory]
    [InlineData("1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI", 24)]
    [InlineData("  1840=99=\nqwer tzui abcd\nefgh qwer tzui\n", 99)]
    public void Should_read_the_preamble_indicator_and_cipher_text_When_a_message_is_parsed(string text, int count)
    {
        // Arrange
        // Act
        var message = RadioMessage.Parse(text);

        // Assert
        Assert.Equal(new TimeOnly(18, 40), message.TimeOfOrigin);
        Assert.Equal(count, message.StatedLetterCount);
        Assert.Equal(new IndicatorGroups("QWER", "TZUI"), message.Indicator);
        Assert.Equal("ABCDEFGH", message.CipherText);
        Assert.Equal(24, message.LetterCount);
    }

    [Fact]
    public void Should_read_the_groups_When_the_preamble_is_missing()
    {
        // Arrange
        // Act
        var message = RadioMessage.Parse("QWER TZUI ABCD QWER TZUI");

        // Assert
        Assert.Null(message.TimeOfOrigin);
        Assert.Null(message.StatedLetterCount);
        Assert.Equal("ABCD", message.CipherText);
    }

    [Theory]
    [InlineData("QWER TZUI ABCD QWER TZUX", "The indicator groups at the end differ from those at the start.")]
    [InlineData("QWER TZUI QWER TZUI", "A message needs the 2 indicator groups, the cipher text and the indicator groups again.")]
    [InlineData("QWER TZUI AB1D QWER TZUI", "A message has only letters after its preamble.")]
    public void Should_reject_the_message_When_it_is_malformed(string text, string error)
    {
        // Arrange
        // Act
        void Act() => RadioMessage.Parse(text);

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal(error, exception.Message);
    }
}
