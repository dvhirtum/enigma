using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class CribPlacementTests
{
    [Fact]
    public void Should_find_the_crash_When_a_crib_letter_stands_under_the_same_cipher_letter()
    {
        // Arrange
        var cipher = Letters("QWERTZUIO");

        // Act
        var placement = new CribPlacement(cipher, Crib.Parse("ARXX"), 2);

        // Assert
        Assert.True(placement.Crashed);
        Assert.Equal([1], placement.Crashes);
    }

    [Fact]
    public void Should_not_crash_When_placing_Carters_crib_under_his_cipher_text()
    {
        // Arrange
        var cipher = Letters(BombeKeys.CarterCipher);

        // Act
        var placement = new CribPlacement(cipher, Crib.Parse(BombeKeys.CarterCrib), 0);

        // Assert
        Assert.False(placement.Crashed);
    }

    [Fact]
    public void Should_link_the_first_crib_letter_at_offset_1_When_the_crib_starts_later_in_the_message()
    {
        // Arrange
        var cipher = Letters("QQ" + BombeKeys.CarterCipher);
        var placement = new CribPlacement(cipher, Crib.Parse(BombeKeys.CarterCrib), 2);

        // Act
        var links = placement.Links;

        // Assert
        Assert.Equal(16, links.Count);
        Assert.Equal(MenuLink.Parse("SW1"), links[0]);
        Assert.Equal(MenuLink.Parse("VE16"), links[^1]);
    }

    [Fact]
    public void Should_refuse_the_links_When_the_placement_crashes()
    {
        // Arrange
        var placement = new CribPlacement(Letters("QWERTZUIO"), Crib.Parse("ARXX"), 2);

        // Act
        object Act() => placement.Links;

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(6)]
    public void Should_reject_the_placement_When_the_crib_does_not_fit_under_the_text(int position)
    {
        // Arrange
        var cipher = Letters("QWERTZUIO");

        // Act
        object Act() => new CribPlacement(cipher, Crib.Parse("ARXX"), position);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_place_the_crib_at_every_position_When_sliding_it_along_the_text()
    {
        // Arrange
        var cipher = Letters("QWERTZUIO");

        // Act
        var placements = CribPlacement.All(cipher, Crib.Parse("ARXX"));

        // Assert
        Assert.Equal([0, 1, 2, 3, 4, 5], placements.Select(placement => placement.Position));
        Assert.Equal([2], placements.Where(placement => placement.Crashed).Select(placement => placement.Position));
    }

    [Theory]
    [InlineData("")]
    [InlineData("WETTER VORHERSAGE")]
    public void Should_reject_the_crib_When_it_is_not_all_letters(string text)
    {
        // Arrange
        // Act
        object Act() => Crib.Parse(text);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    private static Letter[] Letters(string text) => [.. text.Select(Letter.FromChar)];
}
