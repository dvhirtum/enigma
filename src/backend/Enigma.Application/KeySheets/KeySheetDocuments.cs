using System.Text.Json.Serialization;
using Enigma.Application.Machine;
using Enigma.Application.Procedure;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.KeySheets;

/// <summary>
/// A daily key as stored and exchanged: rotors left to right, rings 1–26, plugs such as "AT", and a Grundstellung
/// such as "QRS" (or null).
/// </summary>
public sealed record DailyKeyDocument(
    int Day,
    string Reflector,
    IReadOnlyList<string> Rotors,
    IReadOnlyList<int> Rings,
    IReadOnlyList<string> Plugs,
    string? Grundstellung);

/// <summary>
/// A key sheet file. <see cref="Provenance"/> is Historical, Generated or UserDefined; <see cref="Source"/> names the
/// document a historical sheet was transcribed from. Imports ignore the id and provenance. An exported file also holds
/// the linked <see cref="Kenngruppenbuch"/> and <see cref="Tauschtafeln"/>, so another installation can use them.
/// </summary>
public sealed record KeySheetDocument(
    string? Id,
    string Network,
    string Month,
    string? Provenance,
    string? Source,
    IReadOnlyList<DailyKeyDocument> Days,
    string? KenngruppenbuchId = null,
    string? TauschtafelSetId = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] KenngruppenbuchDocument? Kenngruppenbuch = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] TauschtafelSetDocument? Tauschtafeln = null);

public sealed record KeySheetSummary(
    string Id,
    string Network,
    string Month,
    string Model,
    string Provenance,
    string? Source,
    bool ReadOnly);

/// <summary>A key sheet with its daily keys.</summary>
public sealed record KeySheetDetails(
    string Id,
    string Network,
    string Month,
    string Model,
    string Provenance,
    string? Source,
    bool ReadOnly,
    IReadOnlyList<DailyKeyDocument> Days,
    string? KenngruppenbuchId,
    string? TauschtafelSetId);

public static class KeySheetMapper
{
    public static KeySheetSummary ToSummary(KeySheet sheet)
    {
        ArgumentNullException.ThrowIfNull(sheet);

        return new KeySheetSummary(
            sheet.Id, sheet.Network, sheet.Month.ToString(), sheet.Model.Name,
            ProvenanceName(sheet.Provenance), Source(sheet.Provenance), sheet.IsReadOnly);
    }

    public static KeySheetDetails ToDetails(KeySheet sheet)
    {
        ArgumentNullException.ThrowIfNull(sheet);

        return new KeySheetDetails(
            sheet.Id, sheet.Network, sheet.Month.ToString(), sheet.Model.Name,
            ProvenanceName(sheet.Provenance), Source(sheet.Provenance), sheet.IsReadOnly,
            [.. sheet.DailyKeys.Select(ToDocument)],
            sheet.KenngruppenbuchId, sheet.TauschtafelSetId);
    }

    public static KeySheetDocument ToDocument(KeySheet sheet)
    {
        ArgumentNullException.ThrowIfNull(sheet);

        return new KeySheetDocument(
            sheet.Id, sheet.Network, sheet.Month.ToString(),
            ProvenanceName(sheet.Provenance), Source(sheet.Provenance),
            [.. sheet.DailyKeys.Select(ToDocument)],
            sheet.KenngruppenbuchId, sheet.TauschtafelSetId);
    }

    /// <summary>Builds a sheet from a document. Bad data throws <see cref="DomainException"/>.</summary>
    public static KeySheet FromDocument(KeySheetDocument document, string id, Provenance provenance)
    {
        ArgumentNullException.ThrowIfNull(document);

        if (document.Days is null)
        {
            throw new DomainException("A key sheet file needs a list of days.");
        }

        var sheet = new KeySheet(
            id, document.Network, KeyMonth.Parse(document.Month ?? string.Empty), provenance,
            [.. document.Days.Select(FromDocument)]);
        if (!string.IsNullOrWhiteSpace(document.KenngruppenbuchId) && !string.IsNullOrWhiteSpace(document.TauschtafelSetId))
        {
            sheet.Link(document.KenngruppenbuchId, document.TauschtafelSetId);
        }

        return sheet;
    }

    /// <summary>Reads the provenance stored in a document; unknown values count as user-defined.</summary>
    public static Provenance ProvenanceOf(KeySheetDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        return document.Provenance switch
        {
            "Historical" => Provenance.Historical(document.Source ?? string.Empty),
            "Generated" => Provenance.Generated,
            _ => Provenance.UserDefined,
        };
    }

    private static DailyKeyDocument ToDocument(DailyKey key) => new(
        key.Day,
        key.Reflector.Name,
        [.. key.Rotors.Select(r => r.Name)],
        [.. key.Rings.Select(r => r.Number)],
        [.. key.Plugs.Select(p => p.ToString())],
        key.Grundstellung?.ToString());

    private static DailyKey FromDocument(DailyKeyDocument day)
    {
        if (day?.Rotors is null || day.Rings is null || day.Plugs is null)
        {
            throw new DomainException("Each day of a key sheet needs rotors, rings and plugs.");
        }

        try
        {
            return new DailyKey(
                day.Day,
                Input.Reflector(day.Reflector),
                [.. day.Rotors.Select(Input.Rotor)],
                [.. day.Rings.Select(RingSetting.FromNumber)],
                [.. day.Plugs.Select(Input.PlugPair)],
                string.IsNullOrEmpty(day.Grundstellung) ? null : RotorPositions.Parse(day.Grundstellung));
        }
        catch (DomainException exception) when (!exception.Message.StartsWith("Day ", StringComparison.Ordinal))
        {
            throw new DomainException($"Day {day.Day}: {exception.Message}", exception);
        }
    }

    private static string ProvenanceName(Provenance provenance) => provenance switch
    {
        HistoricalProvenance => "Historical",
        GeneratedProvenance => "Generated",
        _ => "UserDefined",
    };

    private static string? Source(Provenance provenance) => (provenance as HistoricalProvenance)?.Source;
}
