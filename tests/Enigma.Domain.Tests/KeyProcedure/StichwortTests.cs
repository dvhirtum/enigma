using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class StichwortTests
{
    [Fact]
    public void Should_change_rotors_rings_and_plugs_by_the_word_When_Danzig_is_applied()
    {
        // Arrange
        var stichwort = new Stichwort("PERSEUS", "DANZIG");
        var key = Keys.Day(5, "B", "VI I VIII", "01 01 05", "AB YZ", "QRS");

        // Act
        var changed = stichwort.Apply(key);

        // Assert
        Assert.Equal(["II", "V", "IV"], changed.Rotors.Select(r => r.Name));
        Assert.Equal([2, 15, 5], changed.Rings.Select(r => r.Number));
        Assert.Equal(["JK", "HI"], changed.Plugs.Select(p => p.ToString()));
        Assert.Equal("QRS", changed.Grundstellung!.ToString());
    }

    [Fact]
    public void Should_leave_the_Greek_rotor_When_the_Stichwort_is_applied_to_an_M4_key()
    {
        // Arrange
        var stichwort = new Stichwort("ORION", "BREMEN");
        var key = Keys.Day(1, "B-thin", "Beta V VI VIII", "13 02 20 05");

        // Act
        var changed = stichwort.Apply(key);

        // Assert
        Assert.Equal(["Beta", "VII", "VIII", "II"], changed.Rotors.Select(r => r.Name));
        Assert.Equal([13, 20, 25, 18], changed.Rings.Select(r => r.Number));
    }

    [Theory]
    [InlineData("PERSEUS", "DANZ")]
    [InlineData("perseus", "DANZIG")]
    [InlineData("PERSEUS", "DANZ1G")]
    public void Should_reject_the_envelope_When_the_name_or_word_is_not_valid(string name, string word)
    {
        // Act
        var exception = Record.Exception(() => new Stichwort(name, word));

        // Assert
        Assert.IsType<DomainException>(exception);
    }

    [Fact]
    public void Should_give_eight_envelopes_with_different_names_When_a_year_is_generated()
    {
        // Act
        var set = StichwortSet.Generate("id", 1943, new Random(3));

        // Assert
        Assert.Equal(1943, set.Year);
        Assert.Equal(StichwortSet.EnvelopeCount, set.Envelopes.Select(e => e.Name).Distinct().Count());
        Assert.All(set.Envelopes, e => Assert.Equal(Stichwort.WordLength, e.Word.Length));
    }
}
