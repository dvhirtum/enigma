using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
///     A crib laid under the cipher text from <see cref="Position" /> (0 = the first letter). The Enigma never enciphers a
///     letter to itself, so a placement where a crib letter stands under the same cipher letter crashes and is impossible.
/// </summary>
public sealed class CribPlacement
{
    public CribPlacement(IReadOnlyList<Letter> cipherText, Crib crib, int position)
    {
        ArgumentNullException.ThrowIfNull(cipherText);
        ArgumentNullException.ThrowIfNull(crib);

        if (position < 0 || position + crib.Length > cipherText.Count)
            throw new DomainException(
                $"A crib of {crib.Length} letters does not fit at position {position} of a {cipherText.Count}-letter text.");

        CipherText = [.. cipherText];
        Crib = crib;
        Position = position;
        Crashes = [.. Enumerable.Range(0, crib.Length).Where(i => cipherText[position + i] == crib.Letters[i])];
    }

    public IReadOnlyList<Letter> CipherText { get; }

    public Crib Crib { get; }

    public int Position { get; }

    /// <summary>The crib indexes at which the crib letter equals the cipher letter above it.</summary>
    public IReadOnlyList<int> Crashes { get; }

    public bool Crashed => Crashes.Count > 0;

    /// <summary>
    ///     One link per crib letter, from the cipher letter to the crib letter. Offsets count from the crib start: the first
    ///     crib letter is offset 1 (ZZA).
    /// </summary>
    public IReadOnlyList<MenuLink> Links => Crashed
        ? throw new DomainException($"The crib crashes at position {Position}.")
        : [.. Crib.Letters.Select((plain, i) => new MenuLink(CipherText[Position + i], plain, i + 1))];

    /// <summary>Every position the crib fits at, crashed or not.</summary>
    public static IReadOnlyList<CribPlacement> All(IReadOnlyList<Letter> cipherText, Crib crib)
    {
        ArgumentNullException.ThrowIfNull(cipherText);
        ArgumentNullException.ThrowIfNull(crib);

        return
        [
            .. Enumerable.Range(0, Math.Max(0, cipherText.Count - crib.Length + 1))
                .Select(position => new CribPlacement(cipherText, crib, position))
        ];
    }
}
