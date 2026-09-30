using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class SteckerSheetTests
{
    private static readonly Letter E = Letter.FromChar('E');
    private static readonly Letter P = Letter.FromChar('P');
    private static readonly Letter X = Letter.FromChar('X');

    [Fact]
    public void Should_keep_both_partners_and_leave_the_letters_unknown_When_a_pair_contradicts_the_sheet()
    {
        // Arrange
        var sheet = SteckerSheet.Parse("AD EX RR");

        // Act
        var written = sheet.With(P, E);

        // Assert
        Assert.Equal("AD EP EX RR", written.ToString());
        Assert.Equal([E], written.Contradicted);
        Assert.Equal("AD RR", written.Steckers.ToString());
    }

    [Fact]
    public void Should_rub_out_every_pair_of_a_letter_When_it_is_erased()
    {
        // Arrange
        var sheet = SteckerSheet.Parse("AD EP EX RR");

        // Act
        var erased = sheet.Without(E);

        // Assert
        Assert.Equal("AD RR", erased.ToString());
        Assert.Empty(erased.Contradicted);
    }

    [Fact]
    public void Should_write_a_pair_once_When_it_is_written_twice_either_way_round()
    {
        // Arrange
        var sheet = SteckerSheet.Parse("PE");

        // Act
        var written = sheet.With(E, P).With(X, X);

        // Assert
        Assert.Equal("EP XX", written.ToString());
        Assert.Equal(P, written.Steckers.PartnerOf(E));
    }
}
