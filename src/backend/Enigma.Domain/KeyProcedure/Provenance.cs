namespace Enigma.Domain.KeyProcedure;

/// <summary>Where a key sheet comes from.</summary>
public abstract record Provenance
{
    public static Provenance Generated { get; } = new GeneratedProvenance();

    public static Provenance UserDefined { get; } = new UserDefinedProvenance();

    /// <summary>A wartime sheet, read-only. <paramref name="source" /> names the document it was transcribed from.</summary>
    public static Provenance Historical(string source)
    {
        return new HistoricalProvenance(source);
    }
}

public sealed record HistoricalProvenance(string Source) : Provenance;

public sealed record GeneratedProvenance : Provenance;

public sealed record UserDefinedProvenance : Provenance;
