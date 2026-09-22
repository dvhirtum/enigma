namespace Enigma.Architecture.Tests;

public class DependencyDirectionTests
{
    [Theory]
    [InlineData("Enigma.Domain")]
    [InlineData("Enigma.Application", "Enigma.Domain")]
    [InlineData("Enigma.Infrastructure", "Enigma.Application")]
    [InlineData("Enigma.Api", "Enigma.Infrastructure")]
    public void Should_reference_only_the_next_layer_inward_When_inspecting_a_backend_project(
        string project,
        params string[] expected)
    {
        // Arrange
        // Act
        var references = Solution.ProjectReferencesOf(project);

        // Assert
        Assert.Equal(expected, references);
    }
}
