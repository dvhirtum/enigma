using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// What a pinch of a key sheet day gives away: the day's Grundstellung and the bigram table in force. Hut 8 had them
/// from captured documents, as from the Narvik pinch.
/// </summary>
public sealed record Pinch(string SheetId, string Network, KeyMonth Month, int Day, RotorPositions Grundstellung, Doppelbuchstabentauschtafel Table);

/// <summary>
/// A message of the day, with its indicator as written down from the bigram table: the Schlüsselkenngruppe and the
/// Verfahrenkenngruppe (null until written). Generated messages know their solution.
/// </summary>
public sealed class DayMessage(RadioMessage message, Solution? solution)
{
    public RadioMessage Message { get; } = message ?? throw new ArgumentNullException(nameof(message));

    public Solution? Solution { get; } = solution;

    public Kenngruppe? Schluesselkenngruppe { get; internal set; }

    public Kenngruppe? Verfahrenkenngruppe { get; internal set; }
}

/// <summary>
/// The day's traffic read with a pinch: the message broken on the Bombe first, then the day's other messages. Each
/// indicator is turned back with the bigram table and written down.
/// </summary>
public sealed class DayTraffic
{
    private readonly DayMessage[] _messages;

    public DayTraffic(Pinch pinch, RadioMessage broken, IEnumerable<DayMessage> others)
    {
        ArgumentNullException.ThrowIfNull(pinch);
        ArgumentNullException.ThrowIfNull(broken);
        ArgumentNullException.ThrowIfNull(others);

        Pinch = pinch;
        _messages = [new DayMessage(broken, null), .. others];
    }

    public Pinch Pinch { get; }

    /// <summary>The broken message (0), then the day's other messages.</summary>
    public IReadOnlyList<DayMessage> Messages => _messages;

    /// <summary>The indicator of message <paramref name="index"/>, its bigrams swapped back with the pinched table.</summary>
    public Indicator IndicatorOf(int index) => Indicator.Decrypt(Message(index).Message.Indicator, Pinch.Table);

    /// <summary>Writes down the groups read from the indicator of message <paramref name="index"/>; null rubs one out.</summary>
    public void Write(int index, Kenngruppe? schluesselkenngruppe, Kenngruppe? verfahrenkenngruppe)
    {
        var message = Message(index);
        message.Schluesselkenngruppe = schluesselkenngruppe;
        message.Verfahrenkenngruppe = verfahrenkenngruppe;
    }

    /// <summary>Writes down the groups the indicator of message <paramref name="index"/> gives.</summary>
    public void FillIn(int index)
    {
        var indicator = IndicatorOf(index);
        Write(index, indicator.Schluesselkenngruppe, indicator.Verfahrenkenngruppe);
    }

    /// <summary>The Verfahrenkenngruppe written down for message <paramref name="index"/>, refused when missing or wrong.</summary>
    public Kenngruppe WrittenVerfahrenkenngruppe(int index) =>
        Message(index).Verfahrenkenngruppe is not { } written
            ? throw new DomainException("Write down the Verfahrenkenngruppe of the indicator first.")
            : written != IndicatorOf(index).Verfahrenkenngruppe
                ? throw new DomainException($"{written} is not the Verfahrenkenngruppe of the indicator. Look up its bigrams again.")
                : written;

    private DayMessage Message(int index) =>
        index >= 0 && index < _messages.Length
            ? _messages[index]
            : throw new DomainException($"There is no message {index} of the day.");
}
