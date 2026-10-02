using Enigma.Domain.Bombe;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class MessageSourceTests
{
    [Fact]
    public void Should_read_a_radio_message_When_the_pasted_text_repeats_its_indicator_groups()
    {
        // Arrange
        const string text = " 1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI\n";

        // Act
        var source = MessageSource.Pasted(text);

        // Assert
        Assert.Equal(SourceKind.Pasted, source.Kind);
        Assert.Equal(new IndicatorGroups("QWER", "TZUI"), source.Message?.Indicator);
        Assert.Equal("ABCDEFGH", string.Concat(source.CipherText));
        Assert.Equal(text.Trim(), source.Transcript);
        Assert.Null(source.Crib);
        Assert.Null(source.Solution);
    }

    [Fact]
    public void Should_read_bare_cipher_text_When_the_pasted_text_is_not_a_radio_message()
    {
        // Arrange
        // Act
        var source = MessageSource.Pasted("snmkg gstzz\nugarl v");

        // Assert
        Assert.Null(source.Message);
        Assert.Equal(BombeKeys.CarterCipher, string.Concat(source.CipherText));
    }

    [Fact]
    public void Should_reject_the_pasted_text_When_it_has_a_preamble_but_no_repeated_indicator()
    {
        // Arrange
        // Act
        static void Act()
        {
            MessageSource.Pasted("1840 = 24 = QWER TZUI ABCD EFGH");
        }

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Contains("indicator", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Should_reject_the_pasted_text_When_it_has_other_characters_than_letters()
    {
        // Arrange
        // Act
        static void Act()
        {
            MessageSource.Pasted("SNMK-GGST");
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }
}
