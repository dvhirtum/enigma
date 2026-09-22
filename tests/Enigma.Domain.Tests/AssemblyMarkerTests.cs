namespace Enigma.Domain.Tests;

public class AssemblyMarkerTests
{
    [Fact]
    public void Should_live_in_the_Enigma_Domain_namespace_When_inspecting_the_marker()
    {
        // Arrange
        var marker = typeof(AssemblyMarker);

        // Act
        var @namespace = marker.Namespace;

        // Assert
        Assert.Equal("Enigma.Domain", @namespace);
    }
}
