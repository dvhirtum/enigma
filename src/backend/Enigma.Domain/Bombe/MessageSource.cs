using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

public enum SourceKind
{
    Intercept,
    Exercise,
    Pasted,
}

/// <summary>
/// The message a Bombe job breaks: where it came from, a hint, the transcript as received, the Navy radio message when
/// it is one, and the cipher text the crib goes under. Intercepts and exercises also know a likely crib and the solution.
/// </summary>
public sealed record MessageSource(
    SourceKind Kind,
    string Title,
    string? Hint,
    string Transcript,
    RadioMessage? Message,
    IReadOnlyList<Letter> CipherText,
    Crib? Crib = null,
    Solution? Solution = null)
{
    /// <summary>
    /// Reads pasted text as a Navy radio message, or else as bare cipher text. Text with digits must be a radio message.
    /// </summary>
    public static MessageSource Pasted(string text)
    {
        ArgumentNullException.ThrowIfNull(text);

        var transcript = text.Trim();
        if (TryParse(transcript) is { } message)
        {
            return new MessageSource(SourceKind.Pasted, "Pasted radio message", null, transcript, message, Letters(message.CipherText));
        }

        if (transcript.Any(char.IsAsciiDigit))
        {
            RadioMessage.Parse(transcript);
        }

        return new MessageSource(SourceKind.Pasted, "Pasted cipher text", null, transcript, null, Letters(transcript));
    }

    internal static IReadOnlyList<Letter> Letters(string text) =>
        [.. text.Where(c => !char.IsWhiteSpace(c)).Select(Letter.FromChar)];

    private static RadioMessage? TryParse(string text)
    {
        try
        {
            return RadioMessage.Parse(text);
        }
        catch (DomainException)
        {
            return null;
        }
    }
}
