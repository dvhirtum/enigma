using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class SteckersTests
{
    [Fact]
    public void Should_know_both_partners_and_unsteckered_letters_When_parsed()
    {
        // Arrange
        const string pairs = "TE AD RR";

        // Act
        var steckers = Steckers.Parse(pairs);

        // Assert
        Assert.Equal(Letter.FromChar('A'), steckers.PartnerOf(Letter.FromChar('D')));
        Assert.Equal(Letter.FromChar('R'), steckers.PartnerOf(Letter.FromChar('R')));
        Assert.Null(steckers.PartnerOf(Letter.FromChar('B')));
        Assert.Equal("AD ET RR", steckers.ToString());
        Assert.Equal(["AD", "ET"], steckers.Plugs.Select(plug => plug.ToString()));
    }

    [Theory]
    [InlineData("AD AE")]
    [InlineData("AD DE")]
    [InlineData("RR RA")]
    public void Should_refuse_the_pair_When_a_letter_already_has_another_partner(string pairs)
    {
        // Arrange
        // Act
        void Act() => Steckers.Parse(pairs);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_keep_the_steckers_When_a_pair_is_repeated()
    {
        // Arrange
        var steckers = Steckers.Parse("AD");

        // Act
        var again = steckers.With(Letter.FromChar('D'), Letter.FromChar('A'));

        // Assert
        Assert.Equal(steckers, again);
    }
}
