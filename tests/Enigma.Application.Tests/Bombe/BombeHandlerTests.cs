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
        SetUpCarter(menu: false);

        // Act
        var state = new PlaceCribHandler(_store).Handle(new PlaceCrib(0));

        // Assert
        Assert.Equal(0, state.Position);
        Assert.NotNull(state.Menu);
        Assert.True(state.Menu.Loops > 0);
        Assert.InRange(state.Menu.StopsWithBoard, double.Epsilon, state.Menu.StopsWithoutBoard);
    }

    [Fact]
    public void Should_list_every_crib_link_and_leave_unconnected_links_out_When_the_menu_is_set_by_hand()
    {
        // Arrange
        SetUpCarter(menu: false);
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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1000));

        // Act
        var run = await WaitForPositionAsync();

        // Assert
        Assert.Equal("Running", run.Status);
        Assert.Equal(["II V III"], run.WheelOrders);
        Assert.NotNull(run.Position);
        Assert.InRange(run.PositionsTested, 1, DomainPositions - 1);
        new CancelRunHandler(_store).Handle(new CancelRun());
    }

    [Fact]
    public async Task Should_finish_with_the_same_stops_When_a_paced_run_is_set_to_full_speed()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(BombeRun.HistoricalSpeed));
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
        Assert.Single(Stops(), s => s.Position == "VMB" && s.Stecker == "Q");
    }

    [Fact]
    public async Task Should_test_each_copy_with_its_own_wheel_order_When_the_menu_fits_three_times()
    {
        // Arrange
        SetUpCarter(menu: false);
        new PlaceCribHandler(_store).Handle(new PlaceCrib(0));
        new SetMenuHandler(_store).Handle(new SetMenu(CarterLinks[..12], "G"));
        FitDrums(0, "I II III");
        FitDrums(1, "II V III");
        FitDrums(2, "V III II");

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        var run = new GetRunHandler(_store).Handle(new GetRun());
        Assert.Equal(["I II III", "II V III", "V III II"], run.WheelOrders);
        Assert.Equal(DomainPositions, run.PositionsTested);
        Assert.Contains(Stops(), s => s.WheelOrder == "II V III" && s.Position == "VMB" && s.Stecker == "Q");
        Assert.All(Stops(), s => Assert.Contains(s.WheelOrder, run.WheelOrders));
    }

    [Fact]
    public void Should_refuse_the_run_When_a_copy_has_drums_in_only_some_rows()
    {
        // Arrange
        SetUpCarter();
        new FitDrumsHandler(_store).Handle(new FitDrums(0, 1, null));

        // Act
        void Act() => new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_show_the_drums_and_start_letters_When_drums_are_fitted_and_a_scrambler_is_turned()
    {
        // Arrange
        SetUpCarter();

        // Act
        var state = new TurnScramblerHandler(_store).Handle(new TurnScrambler(0, 2, "zzf"));

        // Assert
        Assert.NotNull(state.Machine);
        Assert.Equal(2, state.Machine.ChainsPerCopy);
        var copy = Assert.Single(state.Machine.Copies);
        Assert.Equal(["II", "V", "III"], copy.Drums);
        Assert.Equal(["ZZA", "ZZB", "ZZF", "ZZF"], copy.Starts.Take(4));
    }

    [Fact]
    public async Task Should_keep_the_stops_of_earlier_runs_When_the_Bombe_runs_again()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);
        new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, null, "C"));

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        var state = new GetBombeStateHandler(_store).Handle(new GetBombeState());
        Assert.Equal(2 + state.Run!.Stops, state.Stops);
        Assert.Equal(Enumerable.Range(0, state.Stops), Stops().Select(s => s.Index));    }

    [Fact]
    public async Task Should_clear_the_stops_When_the_menu_changes()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1_000_000));

        // Act
        var first = await WaitForAsync("Paused");
        new ContinueRunHandler(_store).Handle(new ContinueRun());
        var second = await WaitForAsync("Paused");
        new ContinueRunHandler(_store).Handle(new ContinueRun());
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Assert
        Assert.Equal(1, first.Stops);
        Assert.Equal(2, second.Stops);
        Assert.Equal(Stops(), [first.Pause!, second.Pause!]);
        Assert.Contains(Stops(), s => s.Position == "VMB" && s.Stecker == "Q");
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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1_000_000));
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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1_000_000));
        await WaitForAsync("Paused");

        // Act
        void Act() => new SetCribHandler(_store).Handle(new SetCrib("WETTER"));

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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1));

        // Act
        void Act() => new ContinueRunHandler(_store).Handle(new ContinueRun());

        // Assert
        Assert.Throws<DomainException>(Act);
        new CancelRunHandler(_store).Handle(new CancelRun());
    }

    [Fact]
    public void Should_stop_the_run_When_it_is_cancelled()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1));

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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1));

        // Act
        void Act() => new SetCribHandler(_store).Handle(new SetCrib("WETTER"));

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
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(1));

        // Act
        void Act() => new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));

        // Assert
        Assert.Throws<DomainException>(Act);
        new CancelRunHandler(_store).Handle(new CancelRun());
    }

    [Fact]
    public async Task Should_drop_the_run_but_keep_its_stops_When_the_settings_change_after_it()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Act
        var state = new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, false, "B"));

        // Assert
        Assert.Null(state.Run);
        Assert.Null(_store.Run);
        Assert.Equal(2, state.Stops);
    }

    [Fact]
    public void Should_keep_the_diagonal_board_When_the_settings_leave_it_out()
    {
        // Arrange
        new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, false, "B"));

        // Act
        var state = new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, null, "C"));

        // Assert
        Assert.False(state.Settings.DiagonalBoard);
        Assert.Equal("C", state.Settings.Reflector);
    }

    [Fact]
    public void Should_keep_the_settings_When_they_are_left_out()
    {
        // Arrange
        new ConfigureBombeHandler(_store).Handle(new ConfigureBombe("K", false, "C"));

        // Act
        var state = new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, null, null));

        // Assert
        Assert.Equal("K", state.Settings.Input);
        Assert.False(state.Settings.DiagonalBoard);
        Assert.Equal("C", state.Settings.Reflector);
    }

    [Fact]
    public void Should_use_the_default_input_letter_When_the_input_is_empty()
    {
        // Arrange
        SetUpCarter();
        new ConfigureBombeHandler(_store).Handle(new ConfigureBombe("K", null, null));

        // Act
        var state = new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(string.Empty, null, null));

        // Assert
        Assert.Equal("A", state.Settings.Input);
        Assert.Null(_store.Job.ChosenInput);
    }

    [Fact]
    public async Task Should_report_the_error_When_the_run_fails()
    {
        // Arrange
        SetUpCarter();

        // Act
        new StartRunHandler(_store, new FailingClock()).Handle(new StartRun(BombeRun.HistoricalSpeed));
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
        void Act() => new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(speed));

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Null(_store.Run);
    }

    [Fact]
    public void Should_refuse_the_run_When_there_is_no_menu()
    {
        // Arrange
        // Act
        void Act() => new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_report_not_found_When_there_is_no_run()
    {
        // Arrange
        // Act
        void Act() => new GetRunHandler(_store).Handle(new GetRun());

        // Assert
        Assert.Throws<NotFoundException>(Act);
    }

    private IReadOnlyList<StopState> Stops() => new GetStopsHandler(_store).Handle(new GetStops(0));

    private void FitDrums(int copy, string wheelOrder)
    {
        foreach (var (row, rotor) in wheelOrder.Split(' ').Index())
        {
            new FitDrumsHandler(_store).Handle(new FitDrums(copy, row, rotor));
        }
    }

    private async Task<RunState> WaitForAsync(string status)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(Token);
        timeout.CancelAfter(Timeout);
        while (true)
        {
            var run = new GetRunHandler(_store).Handle(new GetRun());
            if (run.Status == status)
            {
                return run;
            }

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
            if (run.Position is not null && run.PositionsTested > 0)
            {
                return run;
            }

            await Task.Delay(10, timeout.Token);
        }
    }

    private void SetUpCarter(bool menu = true)
    {
        new SetCipherTextHandler(_store).Handle(new SetCipherText(CarterCipher));
        new SetCribHandler(_store).Handle(new SetCrib(CarterCrib));
        if (!menu)
        {
            return;
        }

        new PlaceCribHandler(_store).Handle(new PlaceCrib(0));
        new SetMenuHandler(_store).Handle(new SetMenu(CarterLinks, "G"));
        FitDrums(0, "II V III");
    }
}
