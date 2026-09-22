namespace Enigma.Application.Tests;

public class ArchitectureTests
{
    [Fact]
    public void Should_reference_no_outward_assembly_When_inspecting_the_Application()
    {
        // Arrange
        var application = typeof(AssemblyMarker).Assembly;
        string[] outward = ["Enigma.Infrastructure", "Enigma.Api"];

        // Act
        var references = application.GetReferencedAssemblies()
            .Select(reference => reference.Name)
            .OfType<string>()
            .ToArray();

        // Assert
        Assert.Empty(references.Intersect(outward));
    }
}
