using Enigma.Application.Bombe;
using Enigma.Application.Procedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.Bombe;

public sealed class CheckHandlerTests
{
    // Frank Carter's weather crib and training menu (Rutherford Journal 3), test register on G.
    private const string CarterSteckers = "AD ET HM LJ NV UF ZP GQ XO IK RR SS WW";

    private static readonly string[] CarterLinks =
        ["SW1", "NE2", "GE5", "GR6", "SV7", "ZR9", "HZ10", "EU11", "GR12", "AS13", "RA14", "LG15", "EV16"];

    private readonly FakeBombeSessionStore _store = new();

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Should_start_the_check_at_the_stop_When_a_stop_is_first_checked()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);

        // Act
        var check = new GetCheckHandler(_store).Handle(new GetCheck(stop));

        // Assert
        Assert.Equal("GQ", check.Steckers);
        Assert.Equal(26, check.RightRing);
        Assert.Equal("Unchecked", check.Verdict);
        Assert.Equal(stop, check.Stop.Index);
        Assert.Equal(16, check.Crib.Count);
        Assert.DoesNotContain('?', check.Decrypt);
        Assert.Equal("", check.CheckedSteckers);
    }

    [Fact]
    public async Task Should_decrypt_the_crib_and_give_the_key_When_Carters_steckers_are_set()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);

        // Act
        var check = new SetCheckHandler(_store).Handle(new SetCheck(stop, CarterSteckers, null));

        // Assert
        Assert.Equal("WETTERVORHERSAGE", check.Decrypt);
        Assert.All(check.Crib, letter => Assert.Equal("Match", letter.Match));
        Assert.Equal("ULA", check.Key.MessageKey);
        Assert.Equal([26, 26, 26], check.Key.Rings);
        Assert.Equal(10, check.Key.Plugs.Count);
    }

    [Fact]
    public async Task Should_light_R_When_Q_is_pressed_at_link_GR6_on_ZZF_after_setting_up_for_the_stop()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);
        var state = new SetUpCheckingMachineHandler(_store).Handle(new SetUpCheckingMachine(stop));
        new SetCheckingMachineHandler(_store).Handle(new SetCheckingMachine(null, null, null, "zzf"));

        // Act
        var lamp = new PressCheckingKeyHandler(_store).Handle(new PressCheckingKey("q"));

        // Assert
        Assert.Equal(["II", "V", "III"], state.Checker.Drums);
        Assert.Equal("DKX", state.Checker.Rings);
        Assert.Equal(stop, state.Checker.Stop?.Index);
        Assert.Equal("R", lamp.Lamp);
        Assert.Equal("GQ RR", lamp.Check?.Steckers);
    }

    [Fact]
    public async Task Should_forget_the_stop_on_the_checking_machine_When_the_stops_are_cleared()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);
        new SetUpCheckingMachineHandler(_store).Handle(new SetUpCheckingMachine(stop));
        new ClearStopsHandler(_store).Handle(new ClearStops());

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, Notebook: true));
        await _store.Run!.Completion.WaitAsync(TimeSpan.FromSeconds(60), Token);
        var lamp = new PressCheckingKeyHandler(_store).Handle(new PressCheckingKey("q"));

        // Assert
        Assert.NotEmpty(Stops());
        Assert.Null(lamp.Check);
        Assert.Equal("GQ", new GetCheckHandler(_store).Handle(new GetCheck(stop)).Steckers);
    }

    [Fact]
    public async Task Should_take_out_the_cartridge_and_dummy_drum_When_they_are_set_empty()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);
        new SetUpCheckingMachineHandler(_store).Handle(new SetUpCheckingMachine(stop));

        // Act
        var state = new SetCheckingMachineHandler(_store).Handle(new SetCheckingMachine("", null, null, null, Dummy: false));

        // Assert
        Assert.Null(state.Checker.Reflector);
        Assert.False(state.Checker.Dummy);
        Assert.Null(state.Checker.Stop);
    }

    [Fact]
    public async Task Should_fit_a_thin_cartridge_When_it_is_set()
    {
        // Arrange
        await RunCarterAsync(intercept: false);

        // Act
        var state = new SetCheckingMachineHandler(_store).Handle(new SetCheckingMachine("C-thin", null, null, null));

        // Assert
        Assert.Equal("C-thin", state.Checker.Reflector);
        Assert.True(state.Checker.Dummy);
    }

    [Fact]
    public async Task Should_keep_the_verdict_on_the_stop_When_it_is_confirmed()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: true);
        new SetCheckHandler(_store).Handle(new SetCheck(stop, CarterSteckers, null));

        // Act
        var confirmation = new ConfirmCheckHandler(_store).Handle(new ConfirmCheck(stop, "true"));

        // Assert
        Assert.Equal("True", confirmation.Verdict);
        Assert.Empty(confirmation.CribMismatches);
        Assert.NotNull(confirmation.Solution);
        Assert.True(confirmation.Solution.IsTrueStop);
        Assert.True(confirmation.Solution.VerdictCorrect);
        Assert.Equal("AD ET FU GQ HM IK JL NV OX PZ RR SS WW", confirmation.Check.CheckedSteckers);
        Assert.Equal("True", Stops().Single(s => s.Index == stop).Verdict);
        Assert.All(Stops().Where(s => s.Index != stop), s => Assert.Equal("Unchecked", s.Verdict));
    }

    [Fact]
    public async Task Should_not_compare_with_a_solution_When_the_text_was_pasted()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);

        // Act
        var confirmation = new ConfirmCheckHandler(_store).Handle(new ConfirmCheck(stop, "False"));

        // Assert
        Assert.Null(confirmation.Solution);
        Assert.Equal("False", confirmation.Check.Verdict);
    }

    [Theory]
    [InlineData("AD AEX", null)]
    [InlineData(null, 27)]
    public async Task Should_refuse_the_change_When_it_is_not_valid(string? steckers, int? ring)
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);

        // Act
        void Act() => new SetCheckHandler(_store).Handle(new SetCheck(stop, steckers, ring));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Theory]
    [InlineData("Maybe")]
    [InlineData("7")]
    [InlineData(null)]
    public async Task Should_refuse_the_verdict_When_it_is_not_true_false_or_unchecked(string? verdict)
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);

        // Act
        void Act() => new ConfirmCheckHandler(_store).Handle(new ConfirmCheck(stop, verdict));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public async Task Should_say_not_found_When_the_stop_does_not_exist()
    {
        // Arrange
        await RunCarterAsync(intercept: false);

        // Act
        void Act() => new GetCheckHandler(_store).Handle(new GetCheck(99));

        // Assert
        Assert.Throws<NotFoundException>(Act);
    }

    [Fact]
    public async Task Should_keep_the_checks_When_the_Bombe_runs_again()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);
        new ConfirmCheckHandler(_store).Handle(new ConfirmCheck(stop, "True"));

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, Notebook: true));
        await _store.Run!.Completion.WaitAsync(TimeSpan.FromSeconds(60), Token);

        // Assert
        Assert.Equal("True", Stops()[stop].Verdict);
        Assert.All(Stops().Skip(2), s => Assert.Equal("Unchecked", s.Verdict));
    }

    [Fact]
    public async Task Should_propose_the_missing_pairs_without_setting_them_When_steckers_are_suggested()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);
        new SetCheckHandler(_store).Handle(new SetCheck(stop, "AD ET HM LJ NV UF ZP GQ RR SS WW", null));

        // Act
        var suggestion = new SuggestSteckersHandler(_store).Handle(new SuggestSteckers(stop));

        // Assert
        Assert.Equal(["IK", "OX"], suggestion.Pairs.Select(pair => pair.Pair).Order());
        Assert.All(suggestion.Pairs, pair => Assert.True(pair.Gain > 0));
        Assert.Equal("WETTERVORHERSAGE", suggestion.Decrypt);
        Assert.Equal("AD ET FU GQ HM IK JL NV OX PZ RR SS WW", suggestion.Steckers);
        Assert.Equal("AD ET FU GQ HM JL NV PZ RR SS WW", new GetCheckHandler(_store).Handle(new GetCheck(stop)).Steckers);
    }

    [Fact]
    public async Task Should_score_every_ring_and_set_the_lowest_best_When_the_right_ring_is_found()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);
        new SetCheckHandler(_store).Handle(new SetCheck(stop, CarterSteckers, null));

        // Act
        var found = new FindRightRingHandler(_store).Handle(new FindRightRing(stop));

        // Assert
        Assert.Equal(Enumerable.Range(1, 26), found.Rings.Select(ring => ring.Ring));
        Assert.Contains(found.Rings, ring => ring.Ring == 26 && ring.Best);
        Assert.Equal(found.Rings.First(ring => ring.Best).Ring, found.Check.RightRing);
        Assert.Equal("WETTERVORHERSAGE", found.Check.Decrypt);
    }

    private IReadOnlyList<StopState> Stops() => new GetStopsHandler(_store).Handle(new GetStops(0));

    // Runs Carter's menu on II V III and returns the index of the true stop (core positions VMB).
    private async Task<int> RunCarterAsync(bool intercept)
    {
        if (intercept)
        {
            new LoadInterceptHandler(_store).Handle(new LoadIntercept("carter-weather"));
        }
        else
        {
            new SetCipherTextHandler(_store).Handle(new SetCipherText("SNMKGGSTZZUGARLV"));
        }

        new SetCribHandler(_store).Handle(new SetCrib("WETTERVORHERSAGE"));
        new PlaceCribHandler(_store).Handle(new PlaceCrib(0));
        new SetMenuHandler(_store).Handle(new SetMenu(CarterLinks, "G"));
        foreach (var (row, rotor) in "II V III".Split(' ').Index())
        {
            new FitRowHandler(_store).Handle(new FitRow(0, row, 11, rotor));
        }

        new PlugUpMenuHandler(_store).Handle(new PlugUpMenu());
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, Notebook: true));
        await _store.Run!.Completion.WaitAsync(TimeSpan.FromSeconds(60), Token);
        return Stops().Single(s => s.Position == "VMB").Index;
    }
}
