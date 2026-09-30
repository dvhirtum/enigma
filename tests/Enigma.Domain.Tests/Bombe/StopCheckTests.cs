using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;
using Enigma.Domain.Tests.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class StopCheckTests
{
    // Carter's steckers: the ten pairs, with R, S and W unsteckered.
    private const string CarterSteckers = "AD ET HM LJ NV UF ZP GQ XO IK RR SS WW";

    private static readonly Letter G = Letter.FromChar('G');
    private static readonly Letter Q = Letter.FromChar('Q');

    [Fact]
    public void Should_start_with_the_stops_stecker_and_the_drums_at_the_stop_When_created()
    {
        // Arrange
        var stop = CarterStop("VMB");

        // Act
        var check = new StopCheck(stop, ReflectorType.B, CarterPlacement());

        // Assert
        Assert.Equal("GQ", check.Steckers.ToString());
        Assert.Equal("WPC", check.MachinePosition.ToString());
        Assert.Equal(StopVerdict.Unchecked, check.Verdict);
    }

    [Fact]
    public void Should_light_the_partner_of_the_other_letter_When_the_checking_machine_is_set_to_a_link()
    {
        // Arrange
        // Link G–R at offset 6: with G/Q, Q on the machine at the stop plus 6 lights R's partner, R itself.
        var check = new StopCheck(CarterStop("VMB"), ReflectorType.B, CarterPlacement());
        check.MachinePosition = check.MachinePosition.Advance(6);

        // Act
        var lamp = check.Press(Q);

        // Assert
        Assert.Equal(Letter.FromChar('R'), lamp);
    }

    [Fact]
    public void Should_match_the_whole_crib_and_decrypt_it_When_Carters_steckers_are_entered()
    {
        // Arrange
        var check = new StopCheck(CarterStop("VMB"), ReflectorType.B, CarterPlacement())
        {
            Steckers = Steckers.Parse(CarterSteckers),
        };

        // Act
        var plain = check.Decrypt();

        // Assert
        Assert.All(check.Crib(), letter => Assert.Equal(CribMatch.Match, letter.Match));
        Assert.Equal(BombeKeys.CarterCrib, string.Concat(plain));
        Assert.Equal("ULA", check.MessageKey.ToString());
    }

    [Fact]
    public void Should_leave_letters_unknown_When_their_steckers_are_not_found()
    {
        // Arrange
        var check = new StopCheck(CarterStop("VMB"), ReflectorType.B, CarterPlacement());

        // Act
        var crib = check.Crib();
        var plain = check.Decrypt();

        // Assert
        Assert.Equal(CribMatch.Unknown, crib[0].Match);
        Assert.Null(plain[0]);
    }

    [Fact]
    public void Should_mark_the_crib_letter_When_a_stecker_contradicts_it()
    {
        // Arrange
        var check = new StopCheck(CarterStop("VMB"), ReflectorType.B, CarterPlacement())
        {
            Steckers = Steckers.Parse("GQ RA"),
        };

        // Act
        var confirmation = check.Confirm(StopVerdict.True, null);

        // Assert
        Assert.Contains(6, confirmation.CribMismatches);
        Assert.Null(confirmation.Solution);
        Assert.Equal(StopVerdict.True, check.Verdict);
    }

    [Fact]
    public void Should_confirm_the_verdict_and_every_pair_When_compared_with_the_solution()
    {
        // Arrange
        var check = new StopCheck(CarterStop("VMB"), ReflectorType.B, CarterPlacement())
        {
            Steckers = Steckers.Parse(CarterSteckers),
        };

        // Act
        var confirmation = check.Confirm(StopVerdict.True, Intercepts.Find("carter-weather")!.Source.Solution);

        // Assert
        Assert.Empty(confirmation.CribMismatches);
        Assert.Empty(confirmation.CribUnknown);
        var solution = Assert.IsType<SolutionComparison>(confirmation.Solution);
        Assert.True(solution.IsTrueStop);
        Assert.True(solution.VerdictCorrect);
        Assert.Empty(solution.WrongPairs);
        Assert.Empty(solution.MissingPairs);
        Assert.True(solution.RightRingCorrect);
    }

    [Fact]
    public void Should_say_the_verdict_is_wrong_When_a_false_stop_is_called_true()
    {
        // Arrange
        var check = new StopCheck(CarterStop("VMA"), ReflectorType.B, CarterPlacement())
        {
            Steckers = Steckers.Parse("GQ AB"),
        };

        // Act
        var confirmation = check.Confirm(StopVerdict.True, Intercepts.Find("carter-weather")!.Source.Solution);

        // Assert
        var solution = Assert.IsType<SolutionComparison>(confirmation.Solution);
        Assert.False(solution.IsTrueStop);
        Assert.False(solution.VerdictCorrect);
        Assert.Equal(["AB"], solution.WrongPairs);
        Assert.Contains("AD", solution.MissingPairs);
    }

    [Fact]
    public void Should_decrypt_the_whole_message_When_the_right_ring_gives_the_turnover_before_the_crib()
    {
        // Arrange
        // The middle rotor turns over at the third letter, before the crib at position 10.
        var check = TurnoverCheck();
        check.RightRing = RingSetting.FromNumber(5);

        // Act
        var decrypt = string.Concat(check.Decrypt());

        // Assert
        Assert.Equal(TurnoverPlain, decrypt);
        Assert.Equal("ABT", check.MessageKey.ToString());
        Assert.Equal(["26", "26", "05"], check.Key.Rings.Select(ring => ring.Number.ToString("00", System.Globalization.CultureInfo.InvariantCulture)));
    }

    [Fact]
    public void Should_garble_the_letters_before_the_crib_When_the_right_ring_misses_the_turnover()
    {
        // Arrange
        var check = TurnoverCheck();

        // Act
        var decrypt = string.Concat(check.Decrypt());

        // Assert
        Assert.NotEqual(TurnoverPlain[..3], decrypt[..3]);
        Assert.Equal(TurnoverPlain[10..26], decrypt[10..26]);
    }

    private const string TurnoverPlain = "VONXBDUXWETTERVORHERSAGEXBISKAYA";

    // A message on IV I III, rings 26 26 05, from ABT, with the crib at position 10. The middle rotor turns over at the
    // third letter. The check has every stecker and the right ring at Z.
    private static StopCheck TurnoverCheck()
    {
        const string rotors = "IV I III";
        const string plugs = "AB CD EF GH IJ KL MN OP QR ST";
        var cipher = MachineBuilder.Build(MachineModel.M3, "B", rotors, "26 26 05", plugs, "ABT").Type(TurnoverPlain);
        var atCrib = MachineBuilder.Build(MachineModel.M3, "B", rotors, "26 26 05", plugs, "ABT");
        atCrib.Type(TurnoverPlain[..10]);
        var core = BombeKeys.CorePosition("26 26 05", atCrib.Positions());
        var stop = new BombeStop(WheelOrder.Parse(rotors), core, Letter.FromChar('E'), [Letter.FromChar('F')]);
        var placement = new CribPlacement([.. cipher.Select(Letter.FromChar)], Crib.Parse("WETTERVORHERSAGE"), 10);
        return new StopCheck(stop, ReflectorType.B, placement) { Steckers = Steckers.Parse(plugs + " UU VV WW XX YY ZZ") };
    }

    private static BombeStop CarterStop(string core) =>
        new(WheelOrder.Parse("II V III"), DrumPosition.Parse(core), G, [Q]);

    private static CribPlacement CarterPlacement() =>
        new([.. BombeKeys.CarterCipher.Select(Letter.FromChar)], Crib.Parse(BombeKeys.CarterCrib), 0);
}
