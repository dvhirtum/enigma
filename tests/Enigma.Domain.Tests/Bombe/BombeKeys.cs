using System.Globalization;
using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

internal static class BombeKeys
{
    public const string CarterCipher = "SNMKGGSTZZUGARLV";

    public const string CarterCrib = "WETTERVORHERSAGE";

    /// <summary>
    ///     Frank Carter's weather forecast crib, a wartime menu for training Bombe operators: cipher SNMKGGSTZZUGARLV over
    ///     WETTERVORHERSAGE. The menu uses 13 of the 16 pairs, with the test register on G.
    ///     Source: F. Carter, "The Turing bombe in Bletchley Park", Rutherford Journal 3.
    /// </summary>
    public static Menu CarterMenu { get; } = new(
        [.. "SW1 NE2 GE5 GR6 SV7 ZR9 HZ10 EU11 GR12 AS13 RA14 LG15 EV16".Split(' ').Select(MenuLink.Parse)],
        Letter.FromChar('G'));

    /// <summary>The core positions before the first letter: each window letter minus its ring setting.</summary>
    public static DrumPosition CorePosition(string rings, string windows)
    {
        var numbers = rings.Split(' ').Select(ring => int.Parse(ring, CultureInfo.InvariantCulture)).ToArray();
        var cores = windows.Select((window, index) => Letter.FromChar(window).Shift(1 - numbers[index])).ToArray();
        return new DrumPosition(cores[0], cores[1], cores[2]);
    }

    /// <summary>A menu linking every pair of the crib, the first pair at offset 1.</summary>
    public static IReadOnlyList<MenuLink> FullMenu(string cipher, string plain)
    {
        return
        [
            .. cipher.Zip(plain).Select((pair, index) =>
                new MenuLink(Letter.FromChar(pair.First), Letter.FromChar(pair.Second), index + 1))
        ];
    }
}
