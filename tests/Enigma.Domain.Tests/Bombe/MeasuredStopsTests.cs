using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class MeasuredStopsTests
{
    [Fact]
    public void Should_measure_fewer_stops_with_the_diagonal_board_When_Carters_menu_is_run()
    {
        // Arrange
        var menu = BombeKeys.CarterMenu;

        // Act
        var stops = MeasuredStops.Of(menu);

        // Assert
        Assert.InRange(stops.WithBoard, 0, stops.WithoutBoard);
        Assert.True(stops.WithoutBoard > 0);
    }

    [Fact]
    public void Should_measure_several_stops_When_the_quick_rating_expects_about_one()
    {
        // Arrange
        // An exercise menu of 11 letters and 2 loops: run on 40 wheel orders it averaged 3.4 stops, rated 0.96.
        var menu = new Menu(
            [.. "CI2 RN5 DE6 UR7 ET9 UA10 IN11 UD12 BR14 CT15 NQ16 DU17".Split(' ').Select(MenuLink.Parse)],
            Letter.FromChar('U'));

        // Act
        var stops = MeasuredStops.Of(menu);

        // Assert
        Assert.InRange(menu.EstimatedStops(true), 0.5, 1.5);
        Assert.InRange(stops.WithBoard, 1.5, 7);
    }
}
