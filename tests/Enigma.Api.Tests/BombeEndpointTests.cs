using System.Net;
using System.Net.Http.Json;
using Enigma.Application.Bombe;
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
        Assert.Equal("ENY", stop.Indicator);
        Assert.Equal("Q", stop.Stecker);
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
    public async Task Should_return_not_found_When_there_is_no_run()
    {
        // Arrange
        // Act
        using var response = await _client.GetAsync(Url("/api/bombe/run"), Token);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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

    private async Task<T> SendAsync<T>(HttpMethod method, string url, object body)
    {
        using var request = new HttpRequestMessage(method, Url(url)) { Content = JsonContent.Create(body) };
        using var response = await _client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(Token)
            ?? throw new InvalidOperationException("Empty response.");
    }
}
