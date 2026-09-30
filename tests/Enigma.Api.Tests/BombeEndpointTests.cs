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

    private static readonly string[] CarterWheelOrders = ["II V III"];

    private readonly WebApplicationFactory<Program> _factory = new();
    private readonly HttpClient _client;

    public BombeEndpointTests() => _client = _factory.CreateClient();

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
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
            HttpMethod.Put, "/api/bombe/settings", new { input = (string?)null, diagonalBoard = true, reflector = "B", wheelOrders = CarterWheelOrders });

        // Act
        var started = await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run", new { speed = (double?)null });
        var run = await WaitForRunAsync();
        var stops = await _client.GetFromJsonAsync<IReadOnlyList<StopState>>(Url("/api/bombe/run/stops?from=0"), Token);

        // Assert
        Assert.Equal("A", state.Settings.Input);
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
            HttpMethod.Put, "/api/bombe/settings", new { input = (string?)null, diagonalBoard = true, reflector = "B", wheelOrders = CarterWheelOrders });
        await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run", new { speed = 1_000_000.0 });
        var paused = await WaitForRunAsync();

        // Act
        var continued = await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run/continue", new { });

        // Assert
        Assert.Equal("Paused", paused.Status);
        Assert.Equal("VMB", paused.Pause?.Position);
        Assert.Equal("DKX", paused.Pause?.Indicator);
        Assert.Equal("Running", continued.Status);
        Assert.Null(continued.Pause);
        using var response = await _client.DeleteAsync(Url("/api/bombe/run"), Token);
        response.EnsureSuccessStatusCode();
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
            HttpMethod.Put, "/api/bombe/settings", new { input = (string?)null, diagonalBoard = true, reflector = "B", wheelOrders = CarterWheelOrders });
        await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run", new { speed = (double?)null });
        await WaitForRunAsync();
        var stops = await _client.GetFromJsonAsync<IReadOnlyList<StopState>>(Url("/api/bombe/run/stops?from=0"), Token);
        var stop = stops!.Single(s => s.Position == "VMB").Index;

        // Act
        var started = await _client.GetFromJsonAsync<CheckState>(Url($"/api/bombe/run/stops/{stop}/check"), Token);
        var lamp = await SendAsync<LampState>(HttpMethod.Post, $"/api/bombe/run/stops/{stop}/check/press", new { key = "Q" });
        var check = await SendAsync<CheckState>(
            HttpMethod.Put, $"/api/bombe/run/stops/{stop}/check", new { steckers = "AD ET HM LJ NV UF ZP GQ XO IK RR SS WW", machineWindows = (string?)null, machineRings = (string?)null, rightRing = (int?)null });
        var confirmation = await SendAsync<ConfirmationState>(HttpMethod.Post, $"/api/bombe/run/stops/{stop}/check/verdict", new { verdict = "True" });

        // Assert
        Assert.Equal("ZZZ", started?.MachineWindows);
        Assert.Equal("DKX", started?.MachineRings);
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
            HttpMethod.Put, "/api/bombe/settings", new { input = (string?)null, diagonalBoard = true, reflector = "B", wheelOrders = CarterWheelOrders });
        await SendAsync<RunState>(HttpMethod.Post, "/api/bombe/run", new { speed = (double?)null });
        await WaitForRunAsync();
        var stops = await _client.GetFromJsonAsync<IReadOnlyList<StopState>>(Url("/api/bombe/run/stops?from=0"), Token);
        var stop = stops!.Single(s => s.Position == "VMB").Index;
        await SendAsync<CheckState>(
            HttpMethod.Put, $"/api/bombe/run/stops/{stop}/check", new { steckers = "AD ET HM LJ NV UF ZP GQ RR SS WW", machineWindows = (string?)null, machineRings = (string?)null, rightRing = (int?)null });

        // Act
        using var suggestResponse = await _client.PostAsync(Url($"/api/bombe/run/stops/{stop}/check/suggest"), null, Token);
        var suggestion = await suggestResponse.Content.ReadFromJsonAsync<SuggestionState>(Token);
        using var findResponse = await _client.PostAsync(Url($"/api/bombe/run/stops/{stop}/check/find"), null, Token);
        var found = await findResponse.Content.ReadFromJsonAsync<FindState>(Token);

        // Assert
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

    private static Uri Url(string path) => new(path, UriKind.Relative);

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
