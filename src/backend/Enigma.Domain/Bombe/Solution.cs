using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// How a source message was encrypted: the key, the rotor positions the cipher text starts from, the plain text and
/// notes (the source, or the procedure). An exercise also gives its key sheet day and indicator.
/// </summary>
public sealed record Solution(
    ReflectorType Reflector,
    WheelOrder WheelOrder,
    IReadOnlyList<RingSetting> Rings,
    IReadOnlyList<PlugPair> Plugs,
    RotorPositions MessageKey,
    string Plaintext,
    string Notes)
{
    public ExerciseKey? Exercise { get; init; }

    /// <summary>Decrypts <paramref name="cipherText"/> on an M3 set up with this key at the message key.</summary>
    public string Decrypt(IReadOnlyList<Letter> cipherText)
    {
        ArgumentNullException.ThrowIfNull(cipherText);

        var machine = new DailyKey(1, Reflector, [WheelOrder.Left, WheelOrder.Middle, WheelOrder.Right], Rings, Plugs).SetUp();
        foreach (var (slot, position) in machine.Model.Slots.Zip(MessageKey.Positions))
        {
            machine.TurnRotor(slot, position);
        }

        return string.Concat(cipherText.Select(letter =>
        {
            var lamp = machine.PressKey(letter);
            machine.ReleaseKey();
            return lamp;
        }));
    }
}

/// <summary>The key sheet day of an exercise, its Grundstellung and the indicator before the bigram swap.</summary>
public sealed record ExerciseKey(string SheetId, string Network, KeyMonth Month, int Day, RotorPositions Grundstellung, Indicator Indicator);
