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
        Assert.Equal("WPC", check.Position);
        Assert.Equal("GQ", check.Steckers);
        Assert.Equal(26, check.RightRing);
        Assert.Equal("Unchecked", check.Verdict);
        Assert.Equal(stop, check.Stop.Index);
        Assert.Equal(16, check.Crib.Count);
        Assert.Equal(new string('?', 16), check.Decrypt);
    }

    [Fact]
    public async Task Should_decrypt_the_crib_and_give_the_key_When_Carters_steckers_are_set()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);

        // Act
        var check = new SetCheckHandler(_store).Handle(new SetCheck(stop, null, CarterSteckers, null));

        // Assert
        Assert.Equal("WETTERVORHERSAGE", check.Decrypt);
        Assert.All(check.Crib, letter => Assert.Equal("Match", letter.Match));
        Assert.Equal("ULA", check.Key.MessageKey);
        Assert.Equal([26, 26, 26], check.Key.Rings);
        Assert.Equal(10, check.Key.Plugs.Count);
    }

    [Fact]
    public async Task Should_light_R_When_Q_is_pressed_at_link_GR6()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);
        new SetCheckHandler(_store).Handle(new SetCheck(stop, "WPI", null, null));

        // Act
        var lamp = new PressCheckKeyHandler(_store).Handle(new PressCheckKey(stop, "q"));

        // Assert
        Assert.Equal("R", lamp.Lamp);
    }

    [Fact]
    public async Task Should_keep_the_verdict_on_the_stop_When_it_is_confirmed()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: true);
        new SetCheckHandler(_store).Handle(new SetCheck(stop, null, CarterSteckers, null));

        // Act
        var confirmation = new ConfirmCheckHandler(_store).Handle(new ConfirmCheck(stop, "true"));

        // Assert
        Assert.Equal("True", confirmation.Verdict);
        Assert.Empty(confirmation.CribMismatches);
        Assert.NotNull(confirmation.Solution);
        Assert.True(confirmation.Solution.IsTrueStop);
        Assert.True(confirmation.Solution.VerdictCorrect);
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
    [InlineData(null, "AD AE", null)]
    [InlineData("WP", null, null)]
    [InlineData(null, null, 27)]
    public async Task Should_refuse_the_change_When_it_is_not_valid(string? position, string? steckers, int? ring)
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);

        // Act
        void Act() => new SetCheckHandler(_store).Handle(new SetCheck(stop, position, steckers, ring));

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
    public async Task Should_clear_the_checks_When_the_run_starts_again()
    {
        // Arrange
        var stop = await RunCarterAsync(intercept: false);
        new ConfirmCheckHandler(_store).Handle(new ConfirmCheck(stop, "True"));

        // Act
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
        await _store.Run!.Completion.WaitAsync(TimeSpan.FromSeconds(60), Token);

        // Assert
        Assert.All(Stops(), s => Assert.Equal("Unchecked", s.Verdict));
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
        new ConfigureBombeHandler(_store).Handle(new ConfigureBombe(null, true, "B", ["II V III"]));
        new StartRunHandler(_store, TimeProvider.System).Handle(new StartRun(null));
        await _store.Run!.Completion.WaitAsync(TimeSpan.FromSeconds(60), Token);
        return Stops().Single(s => s.Position == "VMB").Index;
    }
}
