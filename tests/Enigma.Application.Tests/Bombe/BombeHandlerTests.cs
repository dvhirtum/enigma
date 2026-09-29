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
        Assert.True(state.Menu.EstimatedStops > 0);
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
        Assert.Equal("ENY", stop.Indicator);
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
    public async Task Should_show_the_drum_position_in_hand_When_the_run_is_paced()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(2000));

        // Act
        await Task.Delay(300, Token);
        var run = new GetRunHandler(_store).Handle(new GetRun());

        // Assert
        Assert.Equal("Running", run.Status);
        Assert.Equal("II V III", run.WheelOrder);
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
    public async Task Should_run_one_wheel_order_at_a_time_When_a_full_speed_run_is_given_a_speed()
    {
        // Arrange
        SetUpCarter(allWheelOrders: true);
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));

        // Act
        new SetRunSpeedHandler(_store).Handle(new SetRunSpeed(1));
        await Task.Delay(2000, Token);

        // Assert
        var run = new GetRunHandler(_store).Handle(new GetRun());
        Assert.Equal("Running", run.Status);
        Assert.Equal(1, run.Speed);
        Assert.NotNull(run.WheelOrder);
        Assert.True(run.WheelOrdersDone < 336, $"{run.WheelOrdersDone} wheel orders done.");
        new CancelRunHandler(_store).Handle(new CancelRun());
    }

    [Fact]
    public void Should_stop_the_run_When_it_is_cancelled()
    {
        // Arrange
        SetUpCarter(allWheelOrders: true);
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));

        // Act
        var run = new CancelRunHandler(_store).Handle(new CancelRun());

        // Assert
        Assert.Equal("Cancelled", run.Status);
        Assert.True(run.WheelOrdersDone < 336, $"{run.WheelOrdersDone} wheel orders done.");
        Assert.Null(run.WheelOrder);
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
    public async Task Should_clear_the_stops_When_the_job_changes_after_a_run()
    {
        // Arrange
        SetUpCarter();
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
        await _store.Run!.Completion.WaitAsync(Timeout, Token);

        // Act
        var state = new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, false, "B", ["II V III"]));

        // Assert
        Assert.Null(state.Run);
        Assert.Null(_store.Run);
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

    private void SetUpCarter(bool menu = true, bool allWheelOrders = false)
    {
        new SetCipherTextHandler(_store).Handle(new SetCipherText(CarterCipher));
        new SetCribHandler(_store).Handle(new SetCrib(CarterCrib));
        if (!menu)
        {
            return;
        }

        new PlaceCribHandler(_store).Handle(new PlaceCrib(0));
        new SetMenuHandler(_store).Handle(new SetMenu(CarterLinks, "G"));
        if (!allWheelOrders)
        {
            new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, true, "B", ["II V III"]));
        }
    }
}
