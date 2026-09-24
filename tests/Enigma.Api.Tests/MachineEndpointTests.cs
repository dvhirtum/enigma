using System.Net;
using System.Net.Http.Json;
using Enigma.Application.Machine;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Enigma.Api.Tests;

public sealed class MachineEndpointTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory = new();
    private readonly HttpClient _client;

    public MachineEndpointTests() => _client = _factory.CreateClient();

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Fact]
    public async Task Should_return_a_default_M3_When_no_machine_was_created()
    {
        // Arrange
        // Act
        var state = await _client.GetFromJsonAsync<MachineState>(Url("/api/machine"), Token);

        // Assert
        Assert.NotNull(state);
        Assert.Equal("M3", state.Model);
        Assert.Equal("B", state.Reflector);
        Assert.Equal(["I", "II", "III"], state.Rotors.Select(r => r.Rotor));
    }

    [Fact]
    public async Task Should_replace_the_machine_When_an_M4_is_created()
    {
        // Arrange
        await SendAsync(HttpMethod.Post, "/api/machine/plugs", new { pair = "AT" });

        // Act
        var state = await SendAsync(HttpMethod.Post, "/api/machine", new { model = "M4" });

        // Assert
        Assert.Equal("M4", state.Model);
        Assert.Equal(["Beta", "I", "II", "III"], state.Rotors.Select(r => r.Rotor));
        Assert.Empty(state.Plugs);
    }

    [Fact]
    public async Task Should_return_camel_case_json_When_the_state_is_requested()
    {
        // Arrange
        // Act
        var json = await _client.GetStringAsync(Url("/api/machine"), Token);

        // Assert
        Assert.Contains("\"rotorBox\":", json, StringComparison.Ordinal);
        Assert.Contains("\"ringSetting\":1", json, StringComparison.Ordinal);
        Assert.Contains("\"slot\":\"Left\"", json, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Should_configure_the_machine_When_each_endpoint_is_called()
    {
        // Arrange
        await SendAsync(HttpMethod.Delete, "/api/machine/rotors");
        await SendAsync(HttpMethod.Put, "/api/machine/rotor-box/IV/ring", new { ringSetting = 21 });
        await SendAsync(HttpMethod.Put, "/api/machine/rotors", new { rotors = "II IV V".Split(' ') });
        await SendAsync(HttpMethod.Put, "/api/machine/reflector", new { reflector = "C" });
        await SendAsync(HttpMethod.Post, "/api/machine/plugs", new { pair = "AV" });
        await SendAsync(HttpMethod.Post, "/api/machine/plugs", new { pair = "BS" });

        // Act
        var state = await SendAsync(HttpMethod.Put, "/api/machine/rotors/middle/position", new { position = "L" });

        // Assert
        Assert.Equal(["II", "IV", "V"], state.Rotors.Select(r => r.Rotor));
        Assert.Equal([1, 21, 1], state.Rotors.Select(r => r.RingSetting));
        Assert.Equal("ALA", string.Concat(state.Rotors.Select(r => r.Position)));
        Assert.Equal("C", state.Reflector);
        Assert.Equal(["AV", "BS"], state.Plugs);
    }

    [Fact]
    public async Task Should_remove_the_cable_When_a_plug_is_disconnected()
    {
        // Arrange
        await SendAsync(HttpMethod.Post, "/api/machine/plugs", new { pair = "AT" });

        // Act
        var state = await SendAsync(HttpMethod.Delete, "/api/machine/plugs/T");

        // Assert
        Assert.Empty(state.Plugs);
    }

    [Fact]
    public async Task Should_join_the_other_end_to_the_new_socket_When_a_plug_is_moved()
    {
        // Arrange
        await SendAsync(HttpMethod.Post, "/api/machine/plugs", new { pair = "AT" });

        // Act
        var state = await SendAsync(HttpMethod.Put, "/api/machine/plugs/A", new { to = "C" });

        // Assert
        Assert.Equal(["CT"], state.Plugs);
    }

    [Fact]
    public async Task Should_light_the_lamp_and_step_When_a_key_is_pressed_and_released()
    {
        // Arrange
        // Act
        var pressed = await SendAsync(HttpMethod.Post, "/api/machine/keyboard/press", new { key = "A" });
        var released = await SendAsync(HttpMethod.Post, "/api/machine/keyboard/release");

        // Assert
        Assert.Equal("B", pressed.LitLamp);
        Assert.Equal("AAB", string.Concat(pressed.Rotors.Select(r => r.Position)));
        Assert.Null(released.LitLamp);
        Assert.Null(released.HeldKey);
    }

    [Fact]
    public async Task Should_decrypt_the_U264_message_When_the_M4_is_set_up_through_the_api()
    {
        // Arrange
        // U-264, 19 November 1942.
        await SendAsync(HttpMethod.Post, "/api/machine", new { model = "M4" });
        await SendAsync(HttpMethod.Delete, "/api/machine/rotors");
        await SendAsync(HttpMethod.Put, "/api/machine/rotor-box/I/ring", new { ringSetting = 22 });
        await SendAsync(HttpMethod.Put, "/api/machine/rotors", new { rotors = "Beta II IV I".Split(' ') });
        foreach (var pair in "AT BL DF GJ HM NW OP QY RZ VX".Split(' '))
        {
            await SendAsync(HttpMethod.Post, "/api/machine/plugs", new { pair });
        }

        foreach (var (slot, position) in new[] { ("greek", "V"), ("left", "J"), ("middle", "N"), ("right", "A") })
        {
            await SendAsync(HttpMethod.Put, $"/api/machine/rotors/{slot}/position", new { position });
        }

        const string ciphertext = "NCZWVUSXPNYMINHZXMQXSFWXWLKJAHSHNMCOCCAKUQPMKCSMHKSEINJUSBLKIOSXCKUBHMLL";
        var plaintext = new System.Text.StringBuilder();

        // Act
        foreach (var key in ciphertext)
        {
            var state = await SendAsync(HttpMethod.Post, "/api/machine/keyboard/press", new { key = key.ToString() });
            plaintext.Append(state.LitLamp);
            await SendAsync(HttpMethod.Post, "/api/machine/keyboard/release");
        }

        // Assert
        Assert.Equal("VONVONJLOOKSJHFFTTTEINSEINSDREIZWOYYQNNSNEUNINHALTXXBEIANGRIFFUNTERWASSE", plaintext.ToString());
    }

    [Theory]
    [InlineData("POST", "/api/machine", "{\"model\":\"M5\"}")]
    [InlineData("PUT", "/api/machine/rotors", "{\"rotors\":[\"I\",\"I\",\"II\"]}")]
    [InlineData("PUT", "/api/machine/rotor-box/I/ring", "{\"ringSetting\":2}")]
    [InlineData("PUT", "/api/machine/reflector", "{\"reflector\":\"B-thin\"}")]
    [InlineData("POST", "/api/machine/plugs", "{\"pair\":\"AA\"}")]
    [InlineData("DELETE", "/api/machine/plugs/Q", null)]
    [InlineData("PUT", "/api/machine/rotors/greek/position", "{\"position\":\"A\"}")]
    [InlineData("POST", "/api/machine/keyboard/press", "{\"key\":\"1\"}")]
    [InlineData("POST", "/api/machine/keyboard/release", null)]
    public async Task Should_return_problem_details_When_the_machine_rejects_the_operation(
        string method, string url, string? body)
    {
        // Arrange
        using var request = new HttpRequestMessage(new HttpMethod(method), Url(url));
        if (body is not null)
        {
            request.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
        }

        // Act
        using var response = await _client.SendAsync(request, Token);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(Token);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(problem);
        Assert.Equal(400, problem.Status);
        Assert.False(string.IsNullOrEmpty(problem.Detail));
    }

    [Fact]
    public async Task Should_reject_a_second_key_When_a_key_is_still_held_down()
    {
        // Arrange
        await SendAsync(HttpMethod.Post, "/api/machine/keyboard/press", new { key = "A" });

        // Act
        using var response = await _client.PostAsJsonAsync(Url("/api/machine/keyboard/press"), new { key = "B" }, Token);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(Token);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Key A is still held down.", problem?.Detail);
    }

    private static Uri Url(string path) => new(path, UriKind.Relative);

    private async Task<MachineState> SendAsync(HttpMethod method, string url, object? body = null)
    {
        using var request = new HttpRequestMessage(method, Url(url));
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        using var response = await _client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<MachineState>(Token)
            ?? throw new InvalidOperationException("Empty response.");
    }
}
