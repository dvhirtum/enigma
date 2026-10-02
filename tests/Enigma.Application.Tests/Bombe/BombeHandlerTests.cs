using Enigma.Application.Bombe;
using Enigma.Application.Procedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.Bombe;

public sealed class BombeHandlerTests
{
    // Frank Carter's weather crib and training menu (Rutherford Journal 3), test register on G.
    private const string CarterCipher = "SNMK GGST ZZUG ARLV";
    private const string CarterCrib = "WETTERVORHERSAGE";
    private const long DomainPositions = 17_576;

    private static readonly string[] CarterLinks =
        ["SW1", "NE2", "GE5", "GR6", "SV7", "ZR9", "HZ10", "EU11", "GR12", "AS13", "RA14", "LG15", "EV16"];

    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(60);

    private readonly FakeBombeSessionStore _store = new();

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    [Fact]
    public void Should_list_the_placements_with_their_crashes_When_the_crib_is_set()
    {
        // Arrange
        new SetCipherTextHandler(_store).Handle(new SetCipherText("ABCDE"));

        // Act
        var state = new SetCribHandler(_store).Handle(new SetCrib("XC"));

        // Assert
        Assert.Equal("ABCDE", state.CipherText);
        Assert.Equal([0, 1, 2, 3], state.Placements.Select(p => p.Position));
        Assert.Equal([1], state.Placements[1].Crashes);
        Assert.Empty(state.Placements[0].Crashes);
    }

    [Fact]
    public void Should_show_the_menu_When_the_crib_is_placed()
    {
        // Arrange
        SetUpCarter(false);

        // Act
        var state = new PlaceCribHandler(_store).Handle(new PlaceCrib(0));

        // Assert
        Assert.Equal(0, state.Position);
        Assert.NotNull(state.Menu);
        Assert.True(state.Menu.Loops > 0);
    }

    [Fact]
    public void Should_measure_fewer_stops_with_the_diagonal_board_When_the_menu_stops_are_asked_for()
    {
        // Arrange
        SetUpCarter(false);
        new PlaceCribHandler(_store).Handle(new PlaceCrib(0));
        var handler = new GetMenuStopsHandler(_store);

        // Act
        var stops = handler.Handle(new GetMenuStops());
        var again = handler.Handle(new GetMenuStops());

        // Assert
        Assert.InRange(stops.WithBoard, 0, stops.WithoutBoard);
        Assert.True(stops.WithoutBoard > 0);
        Assert.Equal(stops, again);
    }

    [Fact]
    public void Should_answer_not_found_When_the_menu_stops_are_asked_for_without_a_menu()
    {
        // Arrange
        var handler = new GetMenuStopsHandler(_store);

        // Act
        object Act()
        {
            return handler.Handle(new GetMenuStops());
        }

        // Assert
        Assert.Throws<NotFoundException>(Act);
    }

    [Fact]
    public void Should_list_every_crib_link_and_leave_unconnected_links_out_When_the_menu_is_set_by_hand()
    {
        // Arrange
        SetUpCarter(false);
        new PlaceCribHandler(_store).Handle(new PlaceCrib(0));

        // Act
        var state = new SetMenuHandler(_store).Handle(new SetMenu([.. CarterLinks, "MT3"], "G"));

        // Assert
        Assert.NotNull(state.Menu);
        Assert.Equal(CarterCrib.Length, state.Menu.CribLinks.Count);
        Assert.Contains("TO8", state.Menu.CribLinks);
        Assert.Equal(CarterLinks.Length + 1, state.Menu.Links.Count);
        Assert.Equal(state.Menu.Links.Where(link => link != "MT3"), state.Menu.ConnectedLinks);
    }

    [Fact]
    public async Task Should_stop_at_Carters_key_When_his_menu_runs_at_full_speed()
    {
        // Arrange
        SetUpCarter();

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        var run = new GetRunHandler(_store).Handle(new GetRun());
        Assert.Equal("Finished", run.Status);
        Assert.Equal(DomainPositions, run.PositionsTested);
        Assert.Equal(2, run.Stops);
        var stop = Assert.Single(new GetStopsHandler(_store).Handle(new GetStops(0)), s => s.Position == "VMB");
        Assert.Equal("II V III", stop.WheelOrder);
        Assert.Equal("DKX", stop.Indicator);
        Assert.Equal("Q", stop.Stecker);
    }

    [Fact]
    public async Task Should_return_the_later_stops_When_stops_are_asked_from_an_index()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);
        var all = new GetStopsHandler(_store).Handle(new GetStops(0));

        // Act
        var later = new GetStopsHandler(_store).Handle(new GetStops(1));

        // Assert
        Assert.Equal(all.Skip(1), later);
    }

    [Fact]
    public async Task Should_return_at_most_the_count_When_stops_are_asked_with_a_count()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);
        var all = new GetStopsHandler(_store).Handle(new GetStops(0));

        // Act
        var page = new GetStopsHandler(_store).Handle(new GetStops(0, 1));

        // Assert
        Assert.True(all.Count > 1);
        Assert.Equal(all.Take(1), page);
    }

    [Fact]
    public async Task Should_show_the_drum_position_in_hand_When_the_run_is_paced()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1000, true));

        // Act
        var run = await WaitForPositionAsync();

        // Assert
        Assert.Equal("Running", run.Status);
        Assert.Equal(["II V III"], run.Groups.Select(group => group.WheelOrder));
        Assert.NotNull(run.Position);
        Assert.InRange(run.PositionsTested, 1, DomainPositions - 1);
        new CancelRunHandler(_store).Handle(new CancelRun());
    }

    [Fact]
    public async Task Should_finish_with_the_same_stops_When_a_paced_run_is_set_to_full_speed()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(BombeRun.HistoricalSpeed, true));
        await Task.Delay(200, Token);

        // Act
        new SetRunSpeedHandler(_store).Handle(new SetRunSpeed(null));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        var run = new GetRunHandler(_store).Handle(new GetRun());
        Assert.Equal("Finished", run.Status);
        Assert.Null(run.Speed);
        Assert.Equal(DomainPositions, run.PositionsTested);
        Assert.Equal(2, run.Stops);
        Assert.Single(Stops(), s => s is { Position: "VMB", Stecker: "Q" });
    }

    [Fact]
    public async Task Should_test_each_chain_with_its_own_wheel_order_When_the_menu_fits_three_times()
    {
        // Arrange
        SetUpCarter(false);
        new PlaceCribHandler(_store).Handle(new PlaceCrib(0));
        new SetMenuHandler(_store).Handle(new SetMenu(CarterLinks[..12], "G"));
        new PlugUpMenuHandler(_store).Handle(new PlugUpMenu());
        FitDrums(0, "I II III");
        FitDrums(1, "II V III");
        FitDrums(2, "V III II");

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        var run = new GetRunHandler(_store).Handle(new GetRun());
        var orders = run.Groups.Select(group => group.WheelOrder).ToList();
        Assert.Equal(["I II III", "II V III", "V III II"], orders);
        Assert.Equal(DomainPositions, run.PositionsTested);
        Assert.Contains(Stops(), s => s is { WheelOrder: "II V III", Position: "VMB", Stecker: "Q" });
        Assert.All(Stops(), s => Assert.Contains(s.WheelOrder, orders));
    }

    [Fact]
    public async Task Should_run_anyway_and_warn_When_a_cabled_scrambler_has_a_drum_missing()
    {
        // Arrange
        SetUpCarter();

        // Act
        var state = new RemoveDrumHandler(_store).Handle(new RemoveDrum(0, 3, 1));
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        Assert.Contains("Chain 1, scrambler 4 is cabled but has drums missing.", state.Machine.Warnings);
        Assert.Equal("Finished", _store.Run.Status.ToString());
    }

    [Fact]
    public void Should_show_the_drums_and_start_letters_and_mark_the_Bombe_plugged_by_hand_When_a_scrambler_is_turned()
    {
        // Arrange
        SetUpCarter();

        // Act
        var state = new TurnScramblerHandler(_store).Handle(new TurnScrambler(0, 2, "zzf"));

        // Assert
        Assert.Equal([true, false], state.Machine.Joins);
        var chain = state.Machine.Chains[0];
        Assert.Equal("G", chain.TestRegister);
        Assert.Equal(["II", "V", "III"], chain.Scramblers[0].Drums);
        Assert.Equal(["S", "W"], chain.Scramblers[0].Jacks);
        Assert.Equal(["ZZA", "ZZB", "ZZF", "ZZF"], chain.Scramblers.Take(4).Select(scrambler => scrambler.Start));
        Assert.False(state.Machine.PluggedForMenu);
        Assert.True(state.Machine.PluggedByHand);
    }

    [Fact]
    public async Task Should_not_log_the_stops_When_a_scrambler_was_turned_after_plugging_up_the_menu()
    {
        // Arrange
        SetUpCarter();
        new TurnScramblerHandler(_store).Handle(new TurnScrambler(0, 2, "zzf"));

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        Assert.False(new GetRunHandler(_store).Handle(new GetRun()).Logged);
        Assert.Empty(Stops());
    }

    [Fact]
    public async Task Should_not_log_the_stops_When_the_menu_changed_after_plugging_it_up()
    {
        // Arrange
        SetUpCarter();
        new SetMenuHandler(_store).Handle(new SetMenu(CarterLinks[..12], "G"));

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        Assert.False(new GetRunHandler(_store).Handle(new GetRun()).Logged);
        Assert.Empty(Stops());
    }

    [Fact]
    public void Should_mark_the_Bombe_as_plugged_by_hand_When_a_jack_is_plugged_by_hand()
    {
        // Arrange
        SetUpCarter();

        // Act
        var state = new PlugJackHandler(_store).Handle(new PlugJack(2, 0, 0, "a"));

        // Assert
        Assert.Equal("A", state.Machine.Chains[2].Scramblers[0].Jacks[0]);
        Assert.False(state.Machine.PluggedForMenu);
        Assert.True(state.Machine.PluggedByHand);
    }

    [Fact]
    public async Task Should_print_the_stops_but_not_log_them_When_the_notebook_is_closed()
    {
        // Arrange
        SetUpCarter();

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, false));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        var state = new GetBombeStateHandler(_store).Handle(new GetBombeState());
        Assert.Equal(0, state.Stops);
        Assert.Equal(2, state.Printed);
        var printed = new GetPrintoutHandler(_store).Handle(new GetPrintout(0));
        var stop = Assert.Single(printed, s => s.Indicator == "DKX");
        Assert.Equal([0, 1], stop.Chains);
        Assert.Equal("WPC", stop.DrumLetters);
        Assert.Equal("Q", stop.Stecker);
        Assert.Equal(25, stop.LiveWires.Length);
    }

    [Fact]
    public async Task Should_keep_the_printout_When_the_menu_changes_until_it_is_cleared()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, false));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Act
        var kept = new BuildMenuHandler(_store).Handle(new BuildMenu());
        var cleared = new ClearPrintoutHandler(_store).Handle(new ClearPrintout());

        // Assert
        Assert.Equal(2, kept.Printed);
        Assert.Equal(0, cleared.Printed);
    }

    [Fact]
    public void Should_plug_the_test_register_and_set_its_input_When_set_by_hand()
    {
        // Arrange
        new SetTestRegisterHandler(_store).Handle(new SetTestRegister(1, "k", "Q"));

        // Act
        var state = new SetTestRegisterHandler(_store).Handle(new SetTestRegister(1, null, string.Empty));

        // Assert
        Assert.Equal("K", state.Machine.Chains[1].TestRegister);
        Assert.Equal("A", state.Machine.Chains[1].Input);
    }

    [Fact]
    public void Should_unplug_the_joined_chains_test_register_When_chains_are_joined()
    {
        // Arrange
        new SetTestRegisterHandler(_store).Handle(new SetTestRegister(1, "K", null));

        // Act
        var state = new JoinChainsHandler(_store).Handle(new JoinChains(0, true));

        // Assert
        Assert.Null(state.Machine.Chains[1].TestRegister);
        Assert.Equal([true, false], state.Machine.Joins);
    }

    [Fact]
    public async Task Should_keep_the_stops_of_earlier_runs_When_the_Bombe_runs_again()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);
        new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, "C"));

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        var state = new GetBombeStateHandler(_store).Handle(new GetBombeState());
        Assert.Equal(2 + state.Run!.Stops, state.Stops);
        Assert.Equal(Enumerable.Range(0, state.Stops), Stops().Select(s => s.Index));
    }

    [Fact]
    public async Task Should_clear_the_stops_When_the_menu_changes()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Act
        var state = new BuildMenuHandler(_store).Handle(new BuildMenu());

        // Assert
        Assert.Equal(0, state.Stops);
        Assert.Empty(Stops());
    }

    [Fact]
    public async Task Should_clear_the_stops_When_asked()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Act
        var state = new ClearStopsHandler(_store).Handle(new ClearStops());

        // Assert
        Assert.Equal(0, state.Stops);
        Assert.Empty(Stops());
    }

    [Fact]
    public async Task Should_pause_at_each_stop_When_the_run_is_paced()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1_000_000, true));

        // Act
        var first = await WaitForAsync("Paused");
        new ContinueRunHandler(_store).Handle(new ContinueRun());
        var second = await WaitForAsync("Paused");
        new ContinueRunHandler(_store).Handle(new ContinueRun());
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        Assert.Equal(1, first.Stops);
        Assert.Equal(2, second.Stops);
        Assert.Equal(
            new GetPrintoutHandler(_store).Handle(new GetPrintout(0)).Select(s => (s.Index, s.DrumLetters, s.Stecker)),
            [
                (first.Pause!.Index, first.Pause.DrumLetters, first.Pause.Stecker),
                (second.Pause!.Index, second.Pause.DrumLetters, second.Pause.Stecker)
            ]);
        Assert.Contains(Stops(), s => s is { Position: "VMB", Stecker: "Q" });
        var run = new GetRunHandler(_store).Handle(new GetRun());
        Assert.Equal("Finished", run.Status);
        Assert.Null(run.Pause);
        Assert.Equal(DomainPositions, run.PositionsTested);
    }

    [Fact]
    public async Task Should_stay_paused_When_a_paused_run_is_set_to_full_speed()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1_000_000, true));
        await WaitForAsync("Paused");

        // Act
        new SetRunSpeedHandler(_store).Handle(new SetRunSpeed(null));
        await Task.Delay(100, Token);
        var paused = new GetRunHandler(_store).Handle(new GetRun());
        new ContinueRunHandler(_store).Handle(new ContinueRun());
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        Assert.Equal("Paused", paused.Status);
        Assert.Equal(1, paused.Stops);
        var run = new GetRunHandler(_store).Handle(new GetRun());
        Assert.Equal("Finished", run.Status);
        Assert.Equal(2, run.Stops);
    }

    [Fact]
    public async Task Should_refuse_to_change_the_job_When_the_run_is_paused()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1_000_000, true));
        await WaitForAsync("Paused");

        // Act
        void Act()
        {
            new SetCribHandler(_store).Handle(new SetCrib("WETTER"));
        }

        // Assert
        Assert.Throws<DomainException>(Act);
        new CancelRunHandler(_store).Handle(new CancelRun());
        Assert.Equal("Cancelled", _store.Run!.Status.ToString());
    }

    [Fact]
    public void Should_refuse_to_continue_When_the_run_is_not_paused()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1, true));

        // Act
        void Act()
        {
            new ContinueRunHandler(_store).Handle(new ContinueRun());
        }

        // Assert
        Assert.Throws<DomainException>(Act);
        new CancelRunHandler(_store).Handle(new CancelRun());
    }

    [Fact]
    public void Should_stop_the_run_When_it_is_cancelled()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1, true));

        // Act
        var run = new CancelRunHandler(_store).Handle(new CancelRun());

        // Assert
        Assert.Equal("Cancelled", run.Status);
        Assert.True(run.PositionsTested < DomainPositions, $"{run.PositionsTested} positions tested.");
        Assert.Null(run.Position);
    }

    [Fact]
    public void Should_refuse_to_change_the_job_When_the_Bombe_is_running()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1, true));

        // Act
        void Act()
        {
            new SetCribHandler(_store).Handle(new SetCrib("WETTER"));
        }

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Equal(CarterCrib, _store.Job.Crib?.ToString());
        new CancelRunHandler(_store).Handle(new CancelRun());
    }

    [Fact]
    public void Should_refuse_a_second_run_When_the_Bombe_is_running()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1, true));

        // Act
        void Act()
        {
            new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        }

        // Assert
        Assert.Throws<DomainException>(Act);
        new CancelRunHandler(_store).Handle(new CancelRun());
    }

    [Fact]
    public async Task Should_drop_the_run_but_keep_its_stops_When_the_settings_change_after_it()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Act
        var state = new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(false, "B"));

        // Assert
        Assert.Null(state.Run);
        Assert.Null(_store.Run);
        Assert.Equal(2, state.Stops);
    }

    [Fact]
    public void Should_keep_the_diagonal_board_When_the_settings_leave_it_out()
    {
        // Arrange
        new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(false, "B"));

        // Act
        var state = new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, "C"));

        // Assert
        Assert.False(state.Settings.DiagonalBoard);
        Assert.Equal("C", state.Settings.Reflector);
    }

    [Fact]
    public void Should_keep_the_settings_When_they_are_left_out()
    {
        // Arrange
        new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(false, "C"));

        // Act
        var state = new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, null));

        // Assert
        Assert.False(state.Settings.DiagonalBoard);
        Assert.Equal("C", state.Settings.Reflector);
    }

    [Fact]
    public async Task Should_report_the_error_When_the_run_fails()
    {
        // Arrange
        SetUpCarter();

        // Act
        new StartRunHandler(_store, new FailingClock()).Handle(new StartRun(BombeRun.HistoricalSpeed, true));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        var run = new GetRunHandler(_store).Handle(new GetRun());
        Assert.Equal("Failed", run.Status);
        Assert.Equal(FailingClock.Message, run.Error);
        Assert.Null(run.Position);
    }

    [Theory]
    [InlineData(0.0)]
    [InlineData(-5.0)]
    [InlineData(double.PositiveInfinity)]
    public void Should_refuse_the_run_When_the_speed_is_not_positive(double speed)
    {
        // Arrange
        SetUpCarter();

        // Act
        void Act()
        {
            new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(speed, true));
        }

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Null(_store.Run);
    }

    [Fact]
    public void Should_refuse_the_run_When_no_test_register_is_plugged()
    {
        // Arrange
        // Act
        void Act()
        {
            new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null, true));
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_report_not_found_When_there_is_no_run()
    {
        // Arrange
        // Act
        void Act()
        {
            new GetRunHandler(_store).Handle(new GetRun());
        }

        // Assert
        Assert.Throws<NotFoundException>(Act);
    }

    private IReadOnlyList<StopState> Stops()
    {
        return new GetStopsHandler(_store).Handle(new GetStops(0));
    }

    private void FitDrums(int chain, string wheelOrder)
    {
        foreach (var (row, rotor) in wheelOrder.Split(' ').Index())
            new FitRowHandler(_store).Handle(new FitRow(chain, row, 11, rotor));
    }

    private async Task<RunState> WaitForAsync(string status)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(Token);
        timeout.CancelAfter(Timeout);
        while (true)
        {
            var run = new GetRunHandler(_store).Handle(new GetRun());
            if (run.Status == status) return run;

            await Task.Delay(10, timeout.Token);
        }
    }

    private async Task<RunState> WaitForPositionAsync()
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(Token);
        timeout.CancelAfter(Timeout);
        while (true)
        {
            var run = new GetRunHandler(_store).Handle(new GetRun());
            if (run is { Position: not null, PositionsTested: > 0 }) return run;

            await Task.Delay(10, timeout.Token);
        }
    }

    private void SetUpCarter(bool menu = true)
    {
        new SetCipherTextHandler(_store).Handle(new SetCipherText(CarterCipher));
        new SetCribHandler(_store).Handle(new SetCrib(CarterCrib));
        if (!menu) return;

        new PlaceCribHandler(_store).Handle(new PlaceCrib(0));
        new SetMenuHandler(_store).Handle(new SetMenu(CarterLinks, "G"));
        FitDrums(0, "II V III");
        new PlugUpMenuHandler(_store).Handle(new PlugUpMenu());
    }
}
