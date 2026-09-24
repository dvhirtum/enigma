using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class IndicatorTests
{
    private static readonly Indicator Example = new(
        Kenngruppe.Parse("RAT"), Kenngruppe.Parse("PEN"), Letter.FromChar('Q'), Letter.FromChar('X'));

    [Fact]
    public void Should_swap_the_vertical_bigrams_When_the_indicator_is_encrypted()
    {
        // Arrange
        // Q R A T
        // P E N X   gives the bigrams QP RE AN TX, swapped to JK IV ZM GC.
        var table = Procedures.MirrorTable();

        // Act
        var groups = Example.Encrypt(table);

        // Assert
        Assert.Equal(["QP", "RE", "AN", "TX"], Example.Bigrams.Select(b => b.ToString()));
        Assert.Equal(new IndicatorGroups("JIZG", "KVMC"), groups);
    }

    [Fact]
    public void Should_give_back_the_groups_and_fillers_When_the_indicator_is_decrypted()
    {
        // Arrange
        var table = Doppelbuchstabentauschtafel.Generate(4, new Random(9));
        var groups = Example.Encrypt(table);

        // Act
        var indicator = Indicator.Decrypt(groups, table);

        // Assert
        Assert.Equal(Example, indicator);
    }

    [Theory]
    [InlineData("B", "I II III", "01 01 01", "AAA", "BDZ")]
    [InlineData("B-thin", "Beta I II III", "01 01 01 01", "AAAA", "ABDZ")]
    public void Should_light_the_Spruchschluessel_When_the_Verfahrenkenngruppe_is_typed_at_the_Grundstellung(
        string reflector, string rotors, string rings, string grundstellung, string spruchschluessel)
    {
        // Arrange
        // I-II-III with reflector B at AAA encrypts AAAAA to BDZGO; the M4 with B-thin and Beta at A matches it.
        var key = Keys.Day(1, reflector, rotors, rings);

        // Act
        var messageKey = MessageKey.Derive(key, RotorPositions.Parse(grundstellung), Kenngruppe.Parse("AAA"));

        // Assert
        Assert.Equal(spruchschluessel, messageKey.Spruchschluessel.ToString());
    }

    [Fact]
    public void Should_keep_the_Greek_rotor_at_its_Grundstellung_letter_When_the_M4_Spruchschluessel_is_built()
    {
        // Arrange
        Letter[] lamps = [Letter.FromChar('K'), Letter.FromChar('L'), Letter.FromChar('M')];

        // Act
        var messageKey = MessageKey.FromLamps(RotorPositions.Parse("VJNA"), Kenngruppe.Parse("ABC"), lamps);

        // Assert
        Assert.Equal("VKLM", messageKey.Spruchschluessel.ToString());
    }
}
