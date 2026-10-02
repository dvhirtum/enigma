using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Enigma.Application.Bombe;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Enigma.Api.Tests;

public sealed class BombeEndpointTests : IDisposable
{
    private static readonly string[] CarterLinks =
        ["SW1", "NE2", "GE5", "GR6", "SV7", "ZR9", "HZ10", "EU11", "GR12", "AS13", "RA14", "LG15", "EV16"];


    private readonly ApiFactory _factory = new();
    private readonly HttpClient _client;

    public BombeEndpointTests() => _client = _factory.CreateClient();

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Fact]
    public async Task Should_measure_the_menus_stops_When_asked_through_the_api()
    {
        // Arrange
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/cipher-text", new { text = "SNMKG GSTZZ UGARL V" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/crib", new { crib = "WETTERVORHERSAGE" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/placement", new { position = 0 });

        // Act
        var stops = await _client.GetFromJsonAsync<MenuStopsState>(Url("/api/bombe/menu/stops"), Token);

        // Assert
        Assert.NotNull(stops);
        Assert.InRange(stops.WithBoard, 0, stops.WithoutBoard);
    }

    [Fact]
    public async Task Should_stop_at_Carters_key_When_his_menu_is_run_through_the_api()
    {
        // Arrange
        // Frank Carter's weather crib and training menu (Rutherford Journal 3).
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/cipher-text", new { text = "SNMKG GSTZZ UGARL V" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/crib", new { crib = "WETTERVORHERSAGE" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/placement", new { position = 0 });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/menu", new { links = CarterLinks, testRegister = "G" });
        var state = await SendAsync<BombeState>(
            HttpMethod.Put, "/api/bombe/settings", new { diagonalBoard = true, reflector = "B" });
        var machine = await FitCarterDrumsAsync();

        // Act
        var started = await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run", new { speed = (double?)null, notebook = true });
        var run = await WaitForRunAsync();
        var stops = await _client.GetFromJsonAsync<IReadOnlyList<StopState>>(Url("/api/bombe/stops?from=0"), Token);

        // Assert
        Assert.Equal("A", machine.Machine.Chains[0].Input);
        Assert.True(state.Settings.DiagonalBoard);
        Assert.Equal("G", state.Menu?.TestRegister);
        Assert.Equal("Running", started.Status);
        Assert.Equal("Finished", run.Status);
        Assert.Equal(2, run.Stops);
        Assert.NotNull(stops);
        var stop = Assert.Single(stops, s => s.Position == "VMB");
        Assert.Equal("DKX", stop.Indicator);
        Assert.Equal("Q", stop.Stecker);
    }

    [Fact]
    public async Task Should_pause_at_a_stop_and_continue_When_a_paced_run_goes_through_the_api()
    {
        // Arrange
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/cipher-text", new { text = "SNMKG GSTZZ UGARL V" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/crib", new { crib = "WETTERVORHERSAGE" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/placement", new { position = 0 });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/menu", new { links = CarterLinks, testRegister = "G" });
        await SendAsync<BombeState>(
            HttpMethod.Put, "/api/bombe/settings", new { diagonalBoard = true, reflector = "B" });
        var machine = await FitCarterDrumsAsync();
        await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run", new { speed = 1_000_000.0, notebook = true });
        var paused = await WaitForRunAsync();

        // Act
        var continued = await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run/continue", new { });

        // Assert
        Assert.Equal("Paused", paused.Status);
        Assert.Equal("WPC", paused.Pause?.DrumLetters);
        Assert.Equal("DKX", paused.Pause?.Indicator);
        Assert.Equal("Running", continued.Status);
        Assert.Null(continued.Pause);
        using var response = await _client.DeleteAsync(Url("/api/bombe/run"), Token);
        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Should_change_the_speed_of_a_paused_run_When_it_is_set_to_full_speed()
    {
        // Arrange
        await SetUpCarterAsync();
        await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run", new { speed = 1_000_000.0, notebook = false });
        await WaitForRunAsync();

        // Act
        var run = await SendAsync<RunState>(HttpMethod.Put, "/api/bombe/run/speed", new { speed = (double?)null });

        // Assert
        Assert.Null(run.Speed);
        Assert.Equal("Paused", run.Status);
        var cancelled = await SendAsync<RunState>(HttpMethod.Delete, "/api/bombe/run", new { });
        Assert.Equal("Cancelled", cancelled.Status);
    }

    [Fact]
    public async Task Should_print_the_stops_and_clear_them_When_a_full_speed_run_has_finished()
    {
        // Arrange
        await SetUpCarterAsync();
        await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run", new { speed = (double?)null, notebook = true });
        await WaitForRunAsync();

        // Act
        var printed = await _client.GetFromJsonAsync<IReadOnlyList<PrintedStopState>>(Url("/api/bombe/printout?from=1&count=1"), Token);
        var logged = await _client.GetFromJsonAsync<IReadOnlyList<StopState>>(Url("/api/bombe/stops?from=1&count=5"), Token);
        var noPrintout = await SendAsync<BombeState>(HttpMethod.Delete, "/api/bombe/printout", new { });
        var noStops = await SendAsync<BombeState>(HttpMethod.Delete, "/api/bombe/stops", new { });

        // Assert
        var stop = Assert.Single(printed!);
        Assert.Equal(1, stop.Index);
        Assert.Equal([0, 1], stop.Chains);
        Assert.Equal(1, Assert.Single(logged!).Index);
        Assert.Equal(0, noPrintout.Printed);
        Assert.Equal(2, noPrintout.Stops);
        Assert.Equal(0, noStops.Stops);
    }

    [Fact]
    public async Task Should_build_a_menu_When_the_crib_is_placed()
    {
        // Arrange
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/cipher-text", new { text = "SNMKG GSTZZ UGARL V" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/crib", new { crib = "WETTERVORHERSAGE" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/placement", new { position = 0 });

        // Act
        var state = await SendAsync<BombeState>(HttpMethod.Post, "/api/bombe/menu/build", new { });
        var read = await _client.GetFromJsonAsync<BombeState>(Url("/api/bombe"), Token);

        // Assert
        Assert.NotEmpty(state.Menu!.Links);
        Assert.Matches("^[A-Z]$", state.Menu.TestRegister);
        Assert.Equal(state.Menu.Links, read!.Menu!.Links);
    }

    [Fact]
    public async Task Should_set_up_the_machine_by_hand_When_each_machine_endpoint_is_called()
    {
        // Arrange
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/machine/chains/1/rows/0", new { rotor = "I", upTo = 1 });

        // Act
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/machine/chains/1/scramblers/0/jacks/0", new { letter = "a" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/machine/chains/1/scramblers/0/jacks/1", new { letter = "B" });
        await SendAsync<BombeState>(HttpMethod.Delete, "/api/bombe/machine/chains/1/scramblers/1/drums/0", new { });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/machine/chains/1/scramblers/0/start", new { start = "qrs" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/machine/chains/1/test-register", new { letter = "C", input = "D" });
        var state = await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/machine/joins/1", new { joined = true });

        // Assert
        var chain = state.Machine.Chains[1];
        Assert.Equal(["A", "B"], chain.Scramblers[0].Jacks);
        Assert.Equal("I", chain.Scramblers[0].Drums[0]);
        Assert.Null(chain.Scramblers[1].Drums[0]);
        Assert.Equal("QRS", chain.Scramblers[0].Start);
        Assert.Equal("C", chain.TestRegister);
        Assert.Equal("D", chain.Input);
        Assert.Equal([false, true], state.Machine.Joins);
        Assert.True(state.Machine.PluggedByHand);
    }

    [Fact]
    public async Task Should_set_up_the_checking_machine_When_it_is_set_by_hand()
    {
        // Arrange
        // Act
        var state = await SendAsync<BombeState>(
            HttpMethod.Put, "/api/bombe/checking", new { reflector = "C", dummy = true, drums = new[] { "III", null, "I" }, rings = "abc", windows = "XYZ" });

        // Assert
        Assert.Equal("C", state.Checker.Reflector);
        Assert.True(state.Checker.Dummy);
        Assert.Equal(["III", null, "I"], state.Checker.Drums);
        Assert.Equal("ABC", state.Checker.Rings);
        Assert.Equal("XYZ", state.Checker.Windows);
    }

    [Fact]
    public async Task Should_return_bad_request_When_the_crib_crashes()
    {
        // Arrange
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/cipher-text", new { text = "ABCDE" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/crib", new { crib = "XC" });

        // Act
        using var response = await _client.PutAsJsonAsync(Url("/api/bombe/placement"), new { position = 1 }, Token);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(Token);
        Assert.Contains("crashes", problem?.Detail, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Should_check_Carters_stop_and_confirm_it_against_the_key_When_checked_through_the_api()
    {
        // Arrange
        await SendAsync<BombeState>(HttpMethod.Post, "/api/bombe/source/intercept", new { id = "carter-weather" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/crib", new { crib = "WETTERVORHERSAGE" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/placement", new { position = 0 });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/menu", new { links = CarterLinks, testRegister = "G" });
        await SendAsync<BombeState>(
            HttpMethod.Put, "/api/bombe/settings", new { diagonalBoard = true, reflector = "B" });
        var machine = await FitCarterDrumsAsync();
        await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run", new { speed = (double?)null, notebook = true });
        await WaitForRunAsync();
        var stops = await _client.GetFromJsonAsync<IReadOnlyList<StopState>>(Url("/api/bombe/stops?from=0"), Token);
        var stop = stops!.Single(s => s.Position == "VMB").Index;

        // Act
        var started = await _client.GetFromJsonAsync<CheckState>(Url($"/api/bombe/stops/{stop}/check"), Token);
        var checker = await SendAsync<BombeState>(HttpMethod.Post, $"/api/bombe/stops/{stop}/checking", new { });
        var lamp = await SendAsync<LampState>(HttpMethod.Post, "/api/bombe/checking/press", new { key = "Q" });
        var check = await SendAsync<CheckState>(
            HttpMethod.Put, $"/api/bombe/stops/{stop}/check", new { steckers = "AD ET HM LJ NV UF ZP GQ XO IK RR SS WW", rightRing = (int?)null });
        var confirmation = await SendAsync<ConfirmationState>(HttpMethod.Post, $"/api/bombe/stops/{stop}/check/verdict", new { verdict = "True" });

        // Assert
        Assert.Equal("ZZZ", checker.Checker.Windows);
        Assert.Equal("DKX", checker.Checker.Rings);
        Assert.Equal("GQ", started?.Steckers);
        Assert.Matches("^[A-Z]$", lamp.Lamp);
        Assert.Equal("WETTERVORHERSAGE", check.Decrypt);
        Assert.Equal("ULA", check.Key.MessageKey);
        Assert.True(confirmation.Solution?.IsTrueStop);
        Assert.True(confirmation.Solution?.VerdictCorrect);
        Assert.Equal("True", confirmation.Check.Stop.Verdict);
    }

    [Fact]
    public async Task Should_suggest_steckers_and_find_the_right_ring_When_asked_through_the_api()
    {
        // Arrange
        await SendAsync<BombeState>(HttpMethod.Post, "/api/bombe/source/intercept", new { id = "carter-weather" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/crib", new { crib = "WETTERVORHERSAGE" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/placement", new { position = 0 });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/menu", new { links = CarterLinks, testRegister = "G" });
        await SendAsync<BombeState>(
            HttpMethod.Put, "/api/bombe/settings", new { diagonalBoard = true, reflector = "B" });
        var machine = await FitCarterDrumsAsync();
        await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run", new { speed = (double?)null, notebook = true });
        await WaitForRunAsync();
        var stops = await _client.GetFromJsonAsync<IReadOnlyList<StopState>>(Url("/api/bombe/stops?from=0"), Token);
        var stop = stops!.Single(s => s.Position == "VMB").Index;
        await SendAsync<CheckState>(
            HttpMethod.Put, $"/api/bombe/stops/{stop}/check", new { steckers = "AD ET HM LJ NV UF ZP GQ RR SS WW", machineWindows = (string?)null, machineRings = (string?)null, rightRing = (int?)null });

        // Act
        using var suggestResponse = await _client.PostAsync(Url($"/api/bombe/stops/{stop}/check/suggest"), null, Token);
        var suggestion = await suggestResponse.Content.ReadFromJsonAsync<SuggestionState>(Token);
        using var findResponse = await _client.PostAsync(Url($"/api/bombe/stops/{stop}/check/find"), null, Token);
        var found = await findResponse.Content.ReadFromJsonAsync<FindState>(Token);
        var middle = await SendAsync<FindState>(HttpMethod.Post, $"/api/bombe/stops/{stop}/check/find-middle", new { });

        // Assert
        Assert.Equal(26, middle.Rings.Count);
        Assert.Contains(middle.Rings, ring => ring.Best && ring.Ring == middle.Check.MiddleRing);
        Assert.Equal(HttpStatusCode.OK, suggestResponse.StatusCode);
        Assert.Equal(["IK", "OX"], suggestion!.Pairs.Select(pair => pair.Pair).Order());
        Assert.Equal("WETTERVORHERSAGE", suggestion.Decrypt);
        Assert.Equal(HttpStatusCode.OK, findResponse.StatusCode);
        Assert.Equal(26, found!.Rings.Count);
        Assert.Equal(found.Rings.First(ring => ring.Best).Ring, found.Check.RightRing);
    }

    [Fact]
    public async Task Should_return_not_found_When_there_is_no_run()
    {
        // Arrange
        // Act
        using var response = await _client.GetAsync(Url("/api/bombe/run"), Token);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Should_load_the_intercept_and_reveal_its_crib_and_key_When_asked_through_the_api()
    {
        // Arrange
        var intercepts = await _client.GetFromJsonAsync<IReadOnlyList<InterceptState>>(Url("/api/bombe/intercepts"), Token);

        // Act
        var state = await SendAsync<BombeState>(HttpMethod.Post, "/api/bombe/source/intercept", new { id = "barbarossa-1941-1" });
        var crib = await _client.GetFromJsonAsync<CribState>(Url("/api/bombe/source/crib"), Token);
        var solution = await _client.GetFromJsonAsync<SolutionState>(Url("/api/bombe/source/solution"), Token);

        // Assert
        Assert.Contains(intercepts!, intercept => intercept.Id == "barbarossa-1941-1" && intercept.Date == "1941-07-07");
        Assert.Equal("Intercept", state.Source?.Kind);
        Assert.Contains("WXC KCH", state.Source?.Transcript, StringComparison.Ordinal);
        Assert.Null(state.Source?.Message);
        Assert.StartsWith("EDPUD", state.CipherText, StringComparison.Ordinal);
        Assert.Equal("AUFKLXABTEILUNGXVONX", crib?.Crib);
        Assert.Equal("II IV V", solution?.WheelOrder);
        Assert.Equal("BLA", solution?.MessageKey);
    }

    [Fact]
    public async Task Should_show_three_wheel_orders_When_asked_for_an_intercept_through_the_api()
    {
        // Arrange
        var loaded = await SendAsync<BombeState>(HttpMethod.Post, "/api/bombe/source/intercept", new { id = "carter-weather" });

        // Act
        var shown = await SendAsync<BombeState>(HttpMethod.Post, "/api/bombe/source/wheel-orders", new { });

        // Assert
        Assert.True(loaded.Source?.HasWheelOrders);
        Assert.Null(loaded.Source?.WheelOrders);
        Assert.Equal(["II V III", "VI III VIII", "IV I VII"], shown.Source?.WheelOrders);
    }

    [Fact]
    public async Task Should_answer_not_found_When_wheel_orders_are_asked_for_pasted_text()
    {
        // Arrange
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/cipher-text", new { text = "QWERT ZUIOP" });

        // Act
        using var response = await _client.PostAsJsonAsync(Url("/api/bombe/source/wheel-orders"), new { }, Token);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Should_suggest_a_crib_for_the_chosen_message_type_When_text_is_pasted()
    {
        // Arrange
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/cipher-text", new { text = "QWERT ZUIOP" });

        // Act
        var types = await _client.GetFromJsonAsync<IReadOnlyList<MessageTypeState>>(Url("/api/bombe/message-types"), Token);
        var crib = await _client.GetFromJsonAsync<CribState>(Url("/api/bombe/source/crib?type=weather"), Token);

        // Assert
        Assert.Contains(types!, type => type.Id == "weather" && type.Name == "Weather forecast");
        Assert.Equal("WETTERVORHERSAGE", crib?.Crib);
        Assert.StartsWith("At or near the start", crib?.Place, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Should_return_not_found_When_the_intercept_is_unknown()
    {
        // Arrange
        // Act
        using var response = await _client.PostAsJsonAsync(Url("/api/bombe/source/intercept"), new { id = "u-110" }, Token);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Should_generate_an_exercise_When_there_are_M3_key_sheets()
    {
        // Arrange
        using var paths = new TemporaryKeySheetPaths();
        using var factory = paths.Configure(_factory);
        using var client = factory.CreateClient();
        using var none = await client.PostAsync(Url("/api/bombe/source/exercise"), null, Token);
        await SendAsync<JsonElement>(client, HttpMethod.Post, "/api/keysheets/generate", new { model = "M3", year = 1944 });

        // Act
        var state = await SendAsync<BombeState>(client, HttpMethod.Post, "/api/bombe/source/exercise", new { });
        var solution = await client.GetFromJsonAsync<SolutionState>(Url("/api/bombe/source/solution"), Token);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, none.StatusCode);
        Assert.Equal("Exercise", state.Source?.Kind);
        Assert.NotNull(state.Source?.Message);
        Assert.NotNull(solution?.Exercise);
        Assert.StartsWith("1944-", solution.Exercise.Month, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Should_take_the_pinch_and_read_the_indicator_When_asked_through_the_api()
    {
        // Arrange
        using var paths = new TemporaryKeySheetPaths();
        using var factory = paths.Configure(_factory);
        using var client = factory.CreateClient();
        await SendAsync<JsonElement>(client, HttpMethod.Post, "/api/keysheets/generate", new { model = "M3", year = 1944 });
        await SendAsync<BombeState>(client, HttpMethod.Post, "/api/bombe/source/exercise", new { });
        var solution = await client.GetFromJsonAsync<SolutionState>(Url("/api/bombe/source/solution"), Token);

        // Act
        var pinched = await SendAsync<BombeState>(client, HttpMethod.Post, "/api/bombe/pinch", new { });
        var written = await SendAsync<BombeState>(client, HttpMethod.Put, "/api/bombe/day/messages/1/indicator", new { verfahrenkenngruppe = "abc" });
        var filled = await SendAsync<BombeState>(client, HttpMethod.Post, "/api/bombe/day/messages/0/indicator/fill-in", new { });
        using var noStop = await client.GetAsync(Url("/api/bombe/stops/0/check/ring-table"), Token);
        using var rings = new HttpRequestMessage(HttpMethod.Put, Url("/api/bombe/stops/0/check/rings")) { Content = JsonContent.Create(new { left = 1 }) };
        using var halfRings = await client.SendAsync(rings, Token);

        // Assert
        Assert.Equal(solution?.Exercise?.Grundstellung, pinched.Day?.Grundstellung);
        Assert.Equal("ABC", written.Day?.Messages[1].Verfahrenkenngruppe);
        Assert.Equal(solution?.Exercise?.Verfahrenkenngruppe, filled.Day?.Messages[0].Verfahrenkenngruppe);
        Assert.Equal(HttpStatusCode.NotFound, noStop.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, halfRings.StatusCode);
    }

    private static Uri Url(string path) => new(path, UriKind.Relative);

    // Places Carter's crib and menu and fits the drums.
    private async Task SetUpCarterAsync()
    {
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/cipher-text", new { text = "SNMKG GSTZZ UGARL V" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/crib", new { crib = "WETTERVORHERSAGE" });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/placement", new { position = 0 });
        await SendAsync<BombeState>(HttpMethod.Put, "/api/bombe/menu", new { links = CarterLinks, testRegister = "G" });
        await FitCarterDrumsAsync();
    }

    // Fits drums II, V and III in the rows of chain 1 and plugs up the menu.
    private async Task<BombeState> FitCarterDrumsAsync()
    {
        foreach (var (row, rotor) in "II V III".Split(' ').Index())
        {
            await SendAsync<BombeState>(HttpMethod.Put, $"/api/bombe/machine/chains/0/rows/{row}", new { rotor, upTo = 11 });
        }

        return await SendAsync<BombeState>(HttpMethod.Post, "/api/bombe/machine/plug-up", new { });
    }

    private async Task<RunState> WaitForRunAsync()
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(Token);
        timeout.CancelAfter(TimeSpan.FromSeconds(60));
        while (true)
        {
            var run = await _client.GetFromJsonAsync<RunState>(Url("/api/bombe/run"), timeout.Token)
                ?? throw new InvalidOperationException("Empty response.");
            if (run.Status != "Running")
            {
                return run;
            }

            await Task.Delay(50, timeout.Token);
        }
    }

    private Task<T> SendAsync<T>(HttpMethod method, string url, object body) => SendAsync<T>(_client, method, url, body);

    private static async Task<T> SendAsync<T>(HttpClient client, HttpMethod method, string url, object body)
    {
        using var request = new HttpRequestMessage(method, Url(url)) { Content = JsonContent.Create(body) };
        using var response = await client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(Token)
            ?? throw new InvalidOperationException("Empty response.");
    }
}

/// <summary>Empty key sheet folders for one test, deleted afterwards.</summary>
internal sealed class TemporaryKeySheetPaths : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory("enigma-bombe-").FullName;

    public WebApplicationFactory<Program> Configure(WebApplicationFactory<Program> factory) =>
        factory.WithWebHostBuilder(builder => builder
            .UseSetting("KeySheets:HistoricalPath", Path.Combine(_root, "historical"))
            .UseSetting("KeySheets:UserPath", Path.Combine(_root, "user")));

    public void Dispose() => Directory.Delete(_root, recursive: true);
}
