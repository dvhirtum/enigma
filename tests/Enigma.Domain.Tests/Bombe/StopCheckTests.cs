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

    [Fact]
    public void Should_suggest_the_pairs_of_the_unused_letters_When_the_menus_steckers_of_Carters_crib_are_entered()
    {
        // Arrange
        // Checking the menu gives every pair but I/K and O/X, whose letters are on the three unused links.
        var check = new StopCheck(CarterStop("VMB"), ReflectorType.B, CarterPlacement())
        {
            Steckers = Steckers.Parse("AD ET HM LJ NV UF ZP GQ RR SS WW"),
        };

        // Act
        var suggestion = check.Suggest();

        // Assert
        Assert.Equal(["IK", "OX"], suggestion.Pairs.Select(pair => pair.ToString()).Order());
        Assert.Equal(BombeKeys.CarterCrib, string.Concat(suggestion.Decrypt));
    }

    [Fact]
    public void Should_leave_the_checks_steckers_as_they_are_When_suggesting()
    {
        // Arrange
        var steckers = Steckers.Parse("AD ET HM LJ NV UF ZP GQ RR SS WW");
        var check = new StopCheck(CarterStop("VMB"), ReflectorType.B, CarterPlacement()) { Steckers = steckers };

        // Act
        var suggestion = check.Suggest();

        // Assert
        Assert.Equal(steckers, check.Steckers);
        Assert.NotEqual(steckers, suggestion.Steckers);
    }

    [Fact]
    public void Should_recover_the_right_ring_and_every_stecker_When_Find_Suggest_and_Find_run_on_a_turnover_before_the_crib()
    {
        // Arrange
        var check = RoundTripCheck(out var menuSteckers);
        check.Steckers = menuSteckers;

        // Act
        check.FindRightRing();
        var suggestion = check.Suggest();
        check.Steckers = suggestion.Steckers;
        var secondFind = check.FindRightRing();

        // Assert
        Assert.All(suggestion.Pairs, pair => Assert.Contains(pair.ToString(), RoundTripAllSteckers.Split(' ')));
        var best = Assert.Single(secondFind, ring => ring.Best);
        Assert.Equal(RoundTripRightRing, best.Ring.Number);
        Assert.Equal(RoundTripRightRing, check.RightRing.Number);
        Assert.Equal(RoundTripPlain, string.Concat(check.Decrypt()));
    }

    [Fact]
    public void Should_find_the_right_ring_When_every_stecker_is_known_and_the_middle_rotor_turns_before_the_crib()
    {
        // Arrange
        var check = RoundTripCheck(out _);

        // Act
        var rings = check.FindRightRing();

        // Assert
        Assert.Equal(RoundTripRightRing, Assert.Single(rings, ring => ring.Best).Ring.Number);
        Assert.Equal(RoundTripPlain, string.Concat(check.Decrypt()));
    }

    [Fact]
    public void Should_mark_every_tied_ring_and_set_the_lowest_When_rings_give_the_same_decrypt()
    {
        // Arrange
        // Carter's sixteen letters see no turnover with most right rings, so those rings decrypt alike.
        var check = new StopCheck(CarterStop("VMB"), ReflectorType.B, CarterPlacement())
        {
            Steckers = Steckers.Parse(CarterSteckers),
        };

        // Act
        var rings = check.FindRightRing();

        // Assert
        var best = rings.Where(ring => ring.Best).ToArray();
        Assert.True(best.Length > 1);
        Assert.Contains(best, ring => ring.Ring.Number == 26);
        Assert.Equal(best[0].Ring, check.RightRing);
        Assert.Equal(26, rings.Count);
    }

    [Fact]
    public void Should_tie_every_ring_and_keep_the_ring_When_no_three_letters_in_a_row_are_known()
    {
        // Arrange
        var check = new StopCheck(CarterStop("VMB"), ReflectorType.B, CarterPlacement());

        // Act
        var rings = check.FindRightRing();

        // Assert
        Assert.All(rings, ring => Assert.Null(ring.Score));
        Assert.All(rings, ring => Assert.True(ring.Best));
        Assert.Equal(26, check.RightRing.Number);
    }

    [Fact]
    public void Should_suggest_only_unsteckered_letters_When_ten_plug_pairs_are_known()
    {
        // Arrange
        var check = RoundTripCheck(out _);
        check.Steckers = Steckers.Parse(RoundTripSteckers);

        // Act
        var suggestion = check.Suggest();

        // Assert
        Assert.NotEmpty(suggestion.Pairs);
        Assert.All(suggestion.Pairs, pair => Assert.Equal(pair.First, pair.Second));
        Assert.Equal(StopCheck.MaxPlugs, suggestion.Steckers.Plugs.Count);
    }

    [Fact]
    public void Should_never_suggest_a_pair_that_contradicts_the_crib_When_suggesting()
    {
        // Arrange
        var check = RoundTripCheck(out var menuSteckers);
        check.Steckers = menuSteckers;

        // Act
        check.Steckers = check.Suggest().Steckers;

        // Assert
        Assert.DoesNotContain(check.Crib(), letter => letter.Match == CribMatch.Mismatch);
    }

    private const string TurnoverPlain = "VONXBDUXWETTERVORHERSAGEXBISKAYA";

    private const string RoundTripPlain =
        "VONXUXEINSNEUNXWETTERVORHERSAGEXBISKAYAXWINDSUEDWESTXVIERXSEEGANGXDREIXLUFTDRUCKXEINSNULLEINSZWOXSIQTXAQTSM";

    private const string RoundTripSteckers = "AB CD EF GH IJ KL MN OP QR ST";

    private const string RoundTripAllSteckers = RoundTripSteckers + " UU VV WW XX YY ZZ";

    private const int RoundTripRightRing = 5;

    // A weather message on IV I III, rings 26 26 05, from ABK, with the crib at position 15. The middle rotor turns
    // over at the twelfth letter, before the crib, and not again within it. The check starts with every stecker and
    // the right ring at Z; menuSteckers are those of the letters on the crib's links, as checking the menu finds them.
    private static StopCheck RoundTripCheck(out Steckers menuSteckers)
    {
        const string rotors = "IV I III";
        const string rings = "26 26 05";
        const int position = 15;
        var cipher = MachineBuilder.Build(MachineModel.M3, "B", rotors, rings, RoundTripSteckers, "ABK").Type(RoundTripPlain);
        var atCrib = MachineBuilder.Build(MachineModel.M3, "B", rotors, rings, RoundTripSteckers, "ABK");
        atCrib.Type(RoundTripPlain[..position]);
        var core = BombeKeys.CorePosition(rings, atCrib.Positions());
        var placement = new CribPlacement([.. cipher.Select(Letter.FromChar)], Crib.Parse("WETTERVORHERSAGE"), position);
        var stop = new BombeStop(WheelOrder.Parse(rotors), core, Letter.FromChar('E'), [Letter.FromChar('F')]);

        var all = Steckers.Parse(RoundTripAllSteckers);
        menuSteckers = placement.Links
            .SelectMany(link => new[] { link.First, link.Second })
            .Aggregate(Steckers.None, (steckers, letter) => steckers.With(letter, all.PartnerOf(letter)!.Value));
        return new StopCheck(stop, ReflectorType.B, placement) { Steckers = all };
    }

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
