using System.Globalization;
using Enigma.Domain.KeyProcedure;

namespace Enigma.Application.OperatorMode;

/// <summary>One vertical bigram of the indicator and what the table swaps it with.</summary>
public sealed record BigramSwapState(string From, string To);

/// <summary>
/// The running operator procedure. <see cref="Direction"/> is Send or Receive; <see cref="Step"/> is ChooseGroups,
/// SetGrundstellung, TypeVerfahrenkenngruppe, SetSpruchschluessel, TypeMessage or Done. <see cref="Typed"/> holds the
/// keys typed for the message and <see cref="Pad"/> the lamps they lit. <see cref="Message"/> is the radio message received, or sent once done.
/// </summary>
public sealed record OperatorState(
    string Direction,
    string Step,
    string Network,
    string KenngruppenbuchId,
    int Table,
    string Grundstellung,
    string? Schluesselkenngruppe,
    string? Verfahrenkenngruppe,
    string Fillers,
    IReadOnlyList<BigramSwapState> Bigrams,
    string? Indicator,
    string SpruchschluesselLamps,
    string? Spruchschluessel,
    string Typed,
    string Pad,
    string? ExpectedKey,
    int FillersNeeded,
    string? CipherText,
    string? Message,
    IReadOnlyList<string> Warnings)
{
    public static OperatorState From(OperatorProcedure procedure)
    {
        ArgumentNullException.ThrowIfNull(procedure);

        var indicator = procedure.Indicator;
        var table = procedure.Context.Table;
        return new OperatorState(
            procedure.Direction.ToString(),
            procedure.Step.ToString(),
            procedure.Context.Network,
            procedure.Context.Book.Id,
            table.Number,
            procedure.Context.Grundstellung.ToString(),
            indicator?.Schluesselkenngruppe.ToString(),
            indicator?.Verfahrenkenngruppe.ToString(),
            $"{procedure.Fillers.Before}{procedure.Fillers.After}",
            indicator is null ? [] : [.. indicator.Bigrams.Select(b => new BigramSwapState(b.ToString(), table.Swap(b).ToString()))],
            procedure.IndicatorGroups?.ToString(),
            Letters(procedure.SpruchschluesselLamps),
            procedure.MessageKey?.Spruchschluessel.ToString(),
            Letters(procedure.Typed),
            Letters(procedure.Pad),
            procedure.ExpectedKey?.ToString(),
            procedure.FillersNeeded,
            procedure.Message?.CipherText,
            procedure.Message?.ToString(),
            procedure.Warnings);
    }

    private static string Letters<T>(IEnumerable<T> letters) =>
        string.Concat(letters.Select(l => string.Format(CultureInfo.InvariantCulture, "{0}", l)));
}
