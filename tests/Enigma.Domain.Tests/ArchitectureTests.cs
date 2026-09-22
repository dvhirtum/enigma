namespace Enigma.Domain.Tests;

public class ArchitectureTests
{
    [Fact]
    public void Should_reference_no_other_Enigma_assembly_When_inspecting_the_Domain()
    {
        // Arrange
        var domain = typeof(AssemblyMarker).Assembly;

        // Act
        var enigmaReferences = domain.GetReferencedAssemblies()
            .Select(reference => reference.Name)
            .OfType<string>()
            .Where(name => name.StartsWith("Enigma.", StringComparison.Ordinal))
            .ToArray();

        // Assert
        Assert.Empty(enigmaReferences);
    }
}
