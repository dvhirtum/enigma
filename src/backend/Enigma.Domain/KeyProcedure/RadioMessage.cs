using System.Globalization;
using System.Text.RegularExpressions;
using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>
///     A message as sent: a preamble (time of origin and total letter count), the indicator groups, the cipher text in
///     groups of 4, and the indicator groups again. For example <c>1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI</c>.
/// </summary>
public sealed partial class RadioMessage
{
    public const int GroupLength = 4;

    private RadioMessage(TimeOnly? timeOfOrigin, int? statedLetterCount, IndicatorGroups indicator, string cipherText)
    {
        TimeOfOrigin = timeOfOrigin;
        StatedLetterCount = statedLetterCount;
        Indicator = indicator;
        CipherText = cipherText;
    }

    public TimeOnly? TimeOfOrigin { get; }

    /// <summary>The letter count given in the preamble, or null without a preamble.</summary>
    public int? StatedLetterCount { get; }

    public IndicatorGroups Indicator { get; }

    public string CipherText { get; }

    /// <summary>All letters sent: the indicator groups twice and the cipher text.</summary>
    public int LetterCount => 4 * GroupLength + CipherText.Length;

    public static RadioMessage Create(TimeOnly timeOfOrigin, IndicatorGroups indicator, string cipherText)
    {
        ArgumentNullException.ThrowIfNull(indicator);
        ArgumentNullException.ThrowIfNull(cipherText);

        if (cipherText.Length == 0 || cipherText.Length % GroupLength != 0 || !cipherText.All(char.IsAsciiLetterUpper))
            throw new DomainException($"The cipher text must fill whole groups of {GroupLength} letters.");

        var message = new RadioMessage(timeOfOrigin, null, indicator, cipherText);
        return new RadioMessage(timeOfOrigin, message.LetterCount, indicator, cipherText);
    }

    /// <summary>
    ///     Reads a message with or without its preamble, which may also be written without separators (<c>1925 21</c>) or
    ///     end with a full stop. The indicator must be repeated at the end.
    /// </summary>
    public static RadioMessage Parse(string text)
    {
        ArgumentNullException.ThrowIfNull(text);

        TimeOnly? time = null;
        int? count = null;
        var preamble = Preamble().Match(text);
        if (preamble.Success)
        {
            time = TimeOnly.TryParseExact(preamble.Groups["time"].Value, "HHmm", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var parsed)
                ? parsed
                : throw new DomainException($"'{preamble.Groups["time"].Value}' is not a time of origin such as 1840.");
            count = int.Parse(preamble.Groups["count"].Value, CultureInfo.InvariantCulture);
            text = text[preamble.Length..];
        }

        var letters = string.Concat(text.Where(c => !char.IsWhiteSpace(c)));
        if (!letters.All(char.IsAsciiLetter))
            throw new DomainException("A message has only letters after its preamble.");

        letters = letters.ToUpperInvariant();
        var indicatorLength = 2 * GroupLength;
        if (letters.Length <= 2 * indicatorLength)
            throw new DomainException(
                "A message needs the 2 indicator groups, the cipher text and the indicator groups again.");

        if (letters[..indicatorLength] != letters[^indicatorLength..])
            throw new DomainException("The indicator groups at the end differ from those at the start.");

        return new RadioMessage(
            time,
            count,
            IndicatorGroups.Parse(letters[..GroupLength], letters[GroupLength..indicatorLength]),
            letters[indicatorLength..^indicatorLength]);
    }

    public override string ToString()
    {
        var groups = new[] { Indicator.First, Indicator.Second }
            .Concat(CipherText.Chunk(GroupLength).Select(g => new string(g)))
            .Concat([Indicator.First, Indicator.Second]);
        var preamble = TimeOfOrigin is { } time
            ? $"{time.ToString("HHmm", CultureInfo.InvariantCulture)} = {StatedLetterCount ?? LetterCount} = "
            : string.Empty;
        return preamble + string.Join(' ', groups);
    }

    [GeneratedRegex(@"^\s*(?<time>\d{4})(?:\s*=\s*|\s+)(?<count>\d{1,6})(?:\s*[=.])?")]
    private static partial Regex Preamble();
}
