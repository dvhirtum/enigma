using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>A key identification group: three letters that identify the daily key of a message.</summary>
public readonly record struct Kenngruppe
{
    private readonly string _letters;

    private Kenngruppe(string letters) => _letters = letters;

    public static Kenngruppe Parse(string value)
    {
        ArgumentNullException.ThrowIfNull(value);

        return value.Length == 3 && value.All(char.IsAsciiLetter)
            ? new Kenngruppe(value.ToUpperInvariant())
            : throw new DomainException($"'{value}' is not a Kenngruppe of three letters.");
    }

    public static Kenngruppe FromLetters(Letter first, Letter second, Letter third) =>
        new($"{first}{second}{third}");

    public override string ToString() => _letters ?? string.Empty;
}
