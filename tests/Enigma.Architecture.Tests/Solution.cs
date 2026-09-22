using System.Xml.Linq;

namespace Enigma.Architecture.Tests;

/// Reads project references straight from the .csproj files in the repository.
internal static class Solution
{
    private static readonly string Root = FindRoot();

    internal static string[] ProjectReferencesOf(string project)
    {
        var file = Directory
            .EnumerateFiles(Root, $"{project}.csproj", SearchOption.AllDirectories)
            .Single();

        return XDocument.Load(file)
            .Descendants("ProjectReference")
            .Select(reference => (string?)reference.Attribute("Include"))
            .OfType<string>()
            .Select(NameOf)
            .Order(StringComparer.Ordinal)
            .ToArray();
    }

    /// Project references are written with Windows separators, whatever the host.
    private static string NameOf(string include) =>
        Path.GetFileNameWithoutExtension(include.Replace('\\', '/'));

    private static string FindRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "Enigma.slnx")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName
            ?? throw new InvalidOperationException("Enigma.slnx not found above " + AppContext.BaseDirectory);
    }
}
