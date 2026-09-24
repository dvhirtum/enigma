using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class KeySheetTests
{
    private static readonly KeyMonth June1944 = new(1944, 6);

    [Fact]
    public void Should_order_the_keys_by_day_and_take_the_model_from_them_When_a_sheet_is_created()
    {
        // Arrange
        DailyKey[] keys = [Keys.M4(3), Keys.M4(1)];

        // Act
        var sheet = new KeySheet("id", " Triton ", June1944, Provenance.UserDefined, keys);

        // Assert
        Assert.Equal([1, 3], sheet.DailyKeys.Select(k => k.Day));
        Assert.Equal(MachineModel.M4, sheet.Model);
        Assert.Equal("Triton", sheet.Network);
        Assert.False(sheet.IsReadOnly);
    }

    [Fact]
    public void Should_reject_the_sheet_When_its_keys_are_for_different_models()
    {
        // Arrange
        DailyKey[] keys = [Keys.M3(1), Keys.M4(2)];

        // Act
        void Act() => _ = new KeySheet("id", "Hydra", June1944, Provenance.UserDefined, keys);

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("Day 2 is for the M4, but day 1 is for the M3.", exception.Message);
    }

    [Fact]
    public void Should_reject_the_sheet_When_a_day_is_outside_the_month()
    {
        // Arrange
        DailyKey[] keys = [Keys.M3(31)];

        // Act
        void Act() => _ = new KeySheet("id", "Hydra", June1944, Provenance.UserDefined, keys);

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("Day 31 is outside 1944-06.", exception.Message);
    }

    [Fact]
    public void Should_reject_the_sheet_When_a_day_appears_twice()
    {
        // Arrange
        DailyKey[] keys = [Keys.M3(5), Keys.M3(5)];

        // Act
        void Act() => _ = new KeySheet("id", "Hydra", June1944, Provenance.UserDefined, keys);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public void Should_reject_the_sheet_When_the_network_is_blank(string network)
    {
        // Arrange
        DailyKey[] keys = [Keys.M3(1)];

        // Act
        void Act() => _ = new KeySheet("id", network, June1944, Provenance.UserDefined, keys);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_the_sheet_When_it_has_no_keys()
    {
        // Arrange
        // Act
        void Act() => _ = new KeySheet("id", "Hydra", June1944, Provenance.UserDefined, []);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_replace_the_keys_When_a_generated_sheet_is_updated()
    {
        // Arrange
        var sheet = new KeySheet("id", "Hydra", June1944, Provenance.Generated, [Keys.M3(1)]);

        // Act
        sheet.Update("Triton", new KeyMonth(1944, 7), [Keys.M4(31)]);

        // Assert
        Assert.Equal("Triton", sheet.Network);
        Assert.Equal("1944-07", sheet.Month.ToString());
        Assert.Equal(MachineModel.M4, sheet.Model);
        Assert.Equal([31], sheet.DailyKeys.Select(k => k.Day));
        Assert.Equal(Provenance.Generated, sheet.Provenance);
    }

    [Fact]
    public void Should_reject_the_update_When_the_sheet_is_historical()
    {
        // Arrange
        var sheet = new KeySheet("id", "Hydra", June1944, Provenance.Historical("source"), [Keys.M3(1)]);

        // Act
        void Act() => sheet.Update("Triton", June1944, [Keys.M3(2)]);

        // Assert
        Assert.True(sheet.IsReadOnly);
        Assert.Throws<DomainException>(Act);
        Assert.Equal("Hydra", sheet.Network);
    }

    [Fact]
    public void Should_return_the_key_of_a_day_When_the_sheet_has_it()
    {
        // Arrange
        var sheet = new KeySheet("id", "Hydra", June1944, Provenance.UserDefined, [Keys.M3(1), Keys.M3(2)]);

        // Act
        var key = sheet.KeyFor(2);

        // Assert
        Assert.Equal(2, key.Day);
        Assert.Throws<DomainException>(() => sheet.KeyFor(3));
    }

    [Theory]
    [InlineData("1944-06", 1944, 6, 30)]
    [InlineData("1944-02", 1944, 2, 29)]
    public void Should_parse_the_month_When_it_is_written_as_year_and_month(string value, int year, int month, int days)
    {
        // Arrange
        // Act
        var parsed = KeyMonth.Parse(value);

        // Assert
        Assert.Equal(year, parsed.Year);
        Assert.Equal(month, parsed.Month);
        Assert.Equal(days, parsed.Days);
        Assert.Equal(value, parsed.ToString());
    }

    [Theory]
    [InlineData("")]
    [InlineData("1944-13")]
    [InlineData("June 1944")]
    public void Should_reject_the_month_When_it_is_not_year_and_month(string value)
    {
        // Arrange
        // Act
        void Act() => KeyMonth.Parse(value);

        // Assert
        Assert.Throws<DomainException>(Act);
    }
}
