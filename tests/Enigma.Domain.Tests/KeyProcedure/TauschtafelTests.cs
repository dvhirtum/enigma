using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class TauschtafelTests
{
    [Fact]
    public void Should_swap_every_bigram_with_another_both_ways_When_a_table_is_generated()
    {
        // Arrange
        var random = new Random(6);

        // Act
        var table = Doppelbuchstabentauschtafel.Generate(1, random);

        // Assert
        Assert.Equal(338, table.Swaps.Count);
        Assert.All(Enumerable.Range(0, Bigram.Count).Select(Bigram.FromIndex), bigram =>
        {
            Assert.NotEqual(bigram, table.Swap(bigram));
            Assert.Equal(bigram, table.Swap(table.Swap(bigram)));
        });
    }

    [Fact]
    public void Should_reject_the_table_When_a_bigram_has_no_swap()
    {
        // Arrange
        var swaps = Procedures.MirrorTable().Swaps.Skip(1);

        // Act
        void Act() => _ = new Doppelbuchstabentauschtafel(3, swaps);

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("Tauschtafel 3: AA has no swap.", exception.Message);
    }

    [Fact]
    public void Should_cycle_through_the_9_tables_by_half_month_When_a_set_is_generated()
    {
        // Arrange
        var random = new Random(8);

        // Act
        var set = TauschtafelSet.Generate("set", 1944, random);

        // Assert
        Assert.Equal(Enumerable.Range(1, 9), set.Tables.Select(t => t.Number));
        Assert.Equal(Enumerable.Range(1, 9), set.Calendar.Take(9).Order());
        Assert.All(Enumerable.Range(9, 15), i => Assert.Equal(set.Calendar[i - 9], set.Calendar[i]));
    }

    [Theory]
    [InlineData(1, 1, 0)]
    [InlineData(1, 15, 0)]
    [InlineData(1, 16, 1)]
    [InlineData(6, 30, 11)]
    [InlineData(12, 31, 23)]
    public void Should_pick_the_table_of_the_half_month_When_a_day_is_given(int month, int day, int halfMonth)
    {
        // Arrange
        var set = TauschtafelSet.Generate("set", 1944, new Random(8));

        // Act
        var table = set.TableFor(new KeyMonth(1944, month), day);

        // Assert
        Assert.Equal(set.Calendar[halfMonth], table.Number);
    }

    [Fact]
    public void Should_reject_the_date_When_it_is_outside_the_year_of_the_set()
    {
        // Arrange
        var set = TauschtafelSet.Generate("set", 1944, new Random(8));

        // Act
        void Act() => set.TableFor(new KeyMonth(1945, 1), 1);

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("The Tauschtafel set for 1944 does not cover 1945-01.", exception.Message);
    }

    [Fact]
    public void Should_tell_whether_two_sets_are_the_same_When_they_are_compared()
    {
        // Arrange
        var set = TauschtafelSet.Generate("set", 1944, new Random(8));
        var same = TauschtafelSet.Generate("set", 1944, new Random(8));
        var other = TauschtafelSet.Generate("set", 1944, new Random(9));

        // Act
        var sameResult = set.IsSameAs(same);
        var otherResult = set.IsSameAs(other);

        // Assert
        Assert.True(sameResult);
        Assert.False(otherResult);
    }
}
