using Enigma.Application.KeySheets;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.KeySheets;

public sealed class KeySheetTextTests
{
    [Fact]
    public void Should_read_every_column_When_a_row_is_in_Navy_order()
    {
        // Arrange
        const string text = "19 B-thin Beta II IV I 01 01 01 22 AT BL DF GJ HM NW OP QY RZ VX ABC DEF\n";

        // Act
        var key = Assert.Single(KeySheetText.Parse(text));

        // Assert
        Assert.Equal(19, key.Day);
        Assert.Equal(ReflectorType.BThin, key.Reflector);
        Assert.Equal([RotorType.Beta, RotorType.II, RotorType.IV, RotorType.I], key.Rotors);
        Assert.Equal([1, 1, 1, 22], key.Rings.Select(r => r.Number));
        Assert.Equal(10, key.Plugs.Count);
        Assert.Equal(["ABC", "DEF"], key.Kenngruppen.Select(k => k.ToString()));
    }

    [Fact]
    public void Should_skip_blank_and_comment_lines_and_ignore_case_When_rows_are_parsed()
    {
        // Arrange
        const string text = "# Hydra\r\n\r\n1 b i ii iii 1 2 3 at\r\n  2 C VIII VII VI 26 25 24  \r\n";

        // Act
        var keys = KeySheetText.Parse(text);

        // Assert
        Assert.Equal([1, 2], keys.Select(k => k.Day));
        Assert.Equal(["AT"], keys[0].Plugs.Select(p => p.ToString()));
        Assert.Equal([26, 25, 24], keys[1].Rings.Select(r => r.Number));
    }

    [Fact]
    public void Should_write_the_rows_it_reads_When_keys_are_formatted()
    {
        // Arrange
        const string text = "1 B-thin Beta II IV I 01 01 01 22 AT BL ABC\n2 C-thin Gamma VI I III 03 01 17 04 CO\n";

        // Act
        var formatted = KeySheetText.Format(KeySheetText.Parse(text));

        // Assert
        Assert.Equal(text, formatted);
    }

    [Theory]
    [InlineData("x B I II III 01 01 01", "Line 1: A row starts with the day of the month.")]
    [InlineData("1 D I II III 01 01 01", "Line 1: Unknown reflector 'D'.")]
    [InlineData("1 B I II IX 01 01 01", "Line 1: Unknown rotor 'IX'.")]
    [InlineData("1 B I II III 01 01 27", "Line 1: Ring setting 27 is outside 1–26.")]
    [InlineData("\n1 B I II III 01 01 01 AT ABCD", "Line 2: 'ABCD' is not a Kenngruppe of three letters.")]
    public void Should_name_the_line_When_a_row_is_invalid(string text, string message)
    {
        // Arrange
        // Act
        void Act() => KeySheetText.Parse(text);

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal(message, exception.Message);
    }
}
