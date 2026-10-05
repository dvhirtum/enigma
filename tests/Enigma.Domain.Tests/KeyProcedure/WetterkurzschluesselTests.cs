using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class WetterkurzschluesselTests
{
    private static readonly IReadOnlyList<WetterTafel> Issues1942 =
        WetterTafelSet.Generate("1942", 1942, new Random(1)).Issues;

    [Fact]
    public void Should_use_every_letter_once_When_any_table_is_read()
    {
        // Arrange
        var tables = Wetterkurzschluessel.Tables;

        // Act
        var letters = tables.Select(t => t.Rows.Count == Letter.Count && t.Rows.All(r => r.Heading.Length == 1)
            ? string.Concat(t.Rows.Select(r => r.Heading))
            : string.Concat(t.Rows.SelectMany(r => r.Cells).Order()));

        // Assert
        Assert.Equal(Enumerable.Range(1, 9), tables.Select(t => t.Number));
        Assert.All(letters, l => Assert.Equal("ABCDEFGHIJKLMNOPQRSTUVWXYZ", string.Concat(l.Order())));
    }

    [Fact]
    public void Should_match_Mahon_s_swell_table_When_table_9_is_read()
    {
        // Act
        var swell = Wetterkurzschluessel.Tables[8].Rows.ToDictionary(r => r.Heading, r => string.Concat(r.Cells));

        // Assert
        Assert.Equal("AIQ", swell["N"]);
        Assert.Equal("FNV", swell["SW"]);
        Assert.Equal("HPX", swell["NW"]);
        Assert.Equal("Y", swell["keine Dünung"]);
        Assert.Equal("Z", swell["Kreuzsee"]);
    }

    [Theory]
    [InlineData("M", "-13")]
    [InlineData("N", "+14")]
    [InlineData("Z", "0")]
    public void Should_follow_Mahon_s_rule_When_a_temperature_is_looked_up(string letter, string temperature)
    {
        // Act
        var row = Wetterkurzschluessel.Tables[4].Rows.Single(r => r.Heading == letter);

        // Assert
        Assert.Contains(temperature, row.Cells[0].Split("  "));
    }

    [Fact]
    public void Should_send_wind_before_weather_and_visibility_When_the_letters_are_ordered()
    {
        // Act
        var order = Wetterkurzschluessel.Order;

        // Assert
        Assert.Equal([1, 2, 3, 4, 5, 8, 6, 7, 9], order);
    }

    [Fact]
    public void Should_follow_the_historical_issues_When_the_tables_for_1942_are_generated()
    {
        // Act
        var issues = Issues1942.Select(i => (i.Kennwort, i.From, i.Until)).ToList();

        // Assert
        Assert.Equal(3, issues.Count);
        Assert.Equal((new DateOnly(1942, 1, 1), new DateOnly(1942, 1, 19)), (issues[0].From, issues[0].Until));
        Assert.Equal(("Weimar", new DateOnly(1942, 1, 20), new DateOnly(1942, 10, 24)), issues[1]);
        Assert.Equal(("Eisenach", new DateOnly(1942, 10, 25), new DateOnly(1943, 1, 10)), issues[2]);
    }

    [Fact]
    public void Should_give_the_same_settings_When_an_issue_spans_two_years()
    {
        // Act
        var tables1943 = WetterTafelSet.Generate("1943", 1943, new Random(99));

        // Assert
        var eisenach = tables1943.Issues[0];
        Assert.Equal("Eisenach", eisenach.Kennwort);
        Assert.Equal(Issues1942[2].Columns.SelectMany(c => c.Settings),
            eisenach.Columns.SelectMany(c => c.Settings));
        Assert.Equal(("Naumburg", new DateOnly(1943, 3, 9)), (tables1943.Issues[1].Kennwort, tables1943.Issues[1].Until));
        Assert.Equal(new DateOnly(1943, 3, 10), tables1943.Issues[2].From);
    }

    [Fact]
    public void Should_change_the_table_every_quarter_When_a_year_outside_the_historical_issues_is_generated()
    {
        // Act
        var tables = WetterTafelSet.Generate("1944", 1944, new Random(4));

        // Assert
        Assert.Equal([1, 4, 7, 10], tables.Issues.Select(i => i.From.Month));
        Assert.Equal(4, tables.Issues.Select(i => i.Kennwort).Distinct().Count());
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(5, 0)]
    [InlineData(6, 1)]
    [InlineData(23, 3)]
    public void Should_take_the_column_of_the_six_hours_When_a_setting_is_looked_up(int hour, int column)
    {
        // Arrange
        var tables = WetterTafelSet.Generate("1944", 1944, new Random(4));
        var date = new DateOnly(1944, 5, 2);

        // Act
        var setting = tables.SettingFor(date, hour, Letter.FromChar('K'));

        // Assert
        Assert.Equal(tables.Issues[1].Columns[column][Letter.FromChar('K')], setting);
        Assert.Equal(3, setting.Count);
    }
}
