using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Enigma.Application.KeySheets;
using Enigma.Application.Machine;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Enigma.Api.Tests;

public sealed class KeySheetEndpointTests : IDisposable
{
    private const string U264Row = "19 B-thin Beta II IV I 01 01 01 22 AT BL DF GJ HM NW OP QY RZ VX ABC\n";

    private const string HistoricalJson = """
        {
          "network": "Hydra",
          "month": "1943-12",
          "source": "Test transcription",
          "days": [
            { "day": 26, "reflector": "B", "rotors": ["III", "VI", "VIII"], "rings": [1, 8, 13],
              "plugs": ["AN", "EZ", "HK", "IJ", "LR", "MQ", "OT", "PV", "SW", "UX"] }
          ]
        }
        """;

    private readonly string _root = Directory.CreateTempSubdirectory("enigma-keysheets-").FullName;
    private readonly List<IDisposable> _disposables = [];

    public KeySheetEndpointTests()
    {
        Directory.CreateDirectory(HistoricalPath);
        File.WriteAllText(Path.Combine(HistoricalPath, "hydra-1943-12.json"), HistoricalJson);
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private string HistoricalPath => Path.Combine(_root, "historical");

    private string UserPath => Path.Combine(_root, "user");

    public void Dispose()
    {
        foreach (var disposable in _disposables)
        {
            disposable.Dispose();
        }

        Directory.Delete(_root, recursive: true);
    }

    [Fact]
    public async Task Should_list_the_historical_sheet_as_read_only_When_the_data_folder_holds_one()
    {
        // Arrange
        var client = CreateClient();

        // Act
        var sheets = await client.GetFromJsonAsync<List<KeySheetSummary>>(Url("/api/keysheets"), Token);

        // Assert
        var sheet = Assert.Single(sheets!);
        Assert.Equal("historical-hydra-1943-12", sheet.Id);
        Assert.Equal("Historical", sheet.Provenance);
        Assert.Equal("Test transcription", sheet.Source);
        Assert.Equal("M3", sheet.Model);
        Assert.True(sheet.ReadOnly);
    }

    [Fact]
    public async Task Should_keep_created_sheets_in_the_user_folder_When_the_api_restarts()
    {
        // Arrange
        var created = await SendAsync<KeySheetDetails>(
            CreateClient(), HttpMethod.Post, "/api/keysheets", new { network = "Triton", month = "1942-11", text = U264Row });

        // Act
        var reloaded = await CreateClient().GetFromJsonAsync<KeySheetDetails>(Url($"/api/keysheets/{created.Id}"), Token);

        // Assert
        Assert.True(File.Exists(Path.Combine(UserPath, created.Id + ".json")));
        Assert.Equal("Triton", reloaded!.Network);
        Assert.Equal(U264Row, reloaded.Text);
    }

    [Fact]
    public async Task Should_update_generate_import_and_delete_sheets_When_each_endpoint_is_called()
    {
        // Arrange
        var client = CreateClient();
        var generated = await SendAsync<KeySheetDetails>(
            client, HttpMethod.Post, "/api/keysheets/generate", new { model = "M4", network = "Triton", month = "1944-06" });
        var imported = await SendAsync<KeySheetDetails>(
            client, HttpMethod.Post, "/api/keysheets/import", JsonSerializer.Deserialize<JsonElement>(HistoricalJson));

        // Act
        var updated = await SendAsync<KeySheetDetails>(
            client, HttpMethod.Put, $"/api/keysheets/{generated.Id}", new { network = "Shark", month = "1942-11", text = U264Row });
        using var deleted = await client.DeleteAsync(Url($"/api/keysheets/{imported.Id}"), Token);
        var sheets = await client.GetFromJsonAsync<List<KeySheetSummary>>(Url("/api/keysheets"), Token);

        // Assert
        Assert.Equal(30, generated.Days.Count);
        Assert.Equal("UserDefined", imported.Provenance);
        Assert.Equal("Shark", updated.Network);
        Assert.Equal("Generated", updated.Provenance);
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(["historical-hydra-1943-12", generated.Id], sheets!.Select(s => s.Id));
    }

    [Fact]
    public async Task Should_set_up_the_machine_When_a_daily_key_is_applied()
    {
        // Arrange
        var client = CreateClient();

        // Act
        var state = await SendAsync<MachineState>(
            client, HttpMethod.Post, "/api/machine/daily-key", new { sheetId = "historical-hydra-1943-12", day = 26 });

        // Assert
        Assert.Equal("M3", state.Model);
        Assert.Equal(["III", "VI", "VIII"], state.Rotors.Select(r => r.Rotor));
        Assert.Equal([1, 8, 13], state.Rotors.Select(r => r.RingSetting));
        Assert.Equal(10, state.Plugs.Count);
        Assert.Equal(new AppliedKeyState("historical-hydra-1943-12", "Hydra", "1943-12", 26, false), state.AppliedKey);
    }

    [Fact]
    public async Task Should_mark_the_applied_key_as_modified_When_a_plug_is_moved_afterwards()
    {
        // Arrange
        var client = CreateClient();
        await SendAsync<MachineState>(
            client, HttpMethod.Post, "/api/machine/daily-key", new { sheetId = "historical-hydra-1943-12", day = 26 });

        // Act
        await SendAsync<MachineState>(client, HttpMethod.Put, "/api/machine/plugs/A", new { to = "B" });
        var json = await client.GetStringAsync(Url("/api/machine"), Token);

        // Assert
        Assert.Contains(
            "\"appliedKey\":{\"sheetId\":\"historical-hydra-1943-12\",\"network\":\"Hydra\",\"month\":\"1943-12\",\"day\":26,\"modified\":true}",
            json,
            StringComparison.Ordinal);
    }

    [Fact]
    public async Task Should_return_problem_details_naming_the_line_When_the_text_is_invalid()
    {
        // Arrange
        var client = CreateClient();

        // Act
        using var response = await client.PostAsJsonAsync(
            Url("/api/keysheets"), new { network = "Triton", month = "1944-06", text = "1 B I II IX 01 01 01" }, Token);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(Token);
        Assert.Equal("The operation was rejected.", problem!.Title);
        Assert.Equal("Line 1: Unknown rotor 'IX'.", problem.Detail);
    }

    [Fact]
    public async Task Should_reject_the_change_When_the_historical_sheet_is_deleted()
    {
        // Arrange
        var client = CreateClient();

        // Act
        using var response = await client.DeleteAsync(Url("/api/keysheets/historical-hydra-1943-12"), Token);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(File.Exists(Path.Combine(HistoricalPath, "hydra-1943-12.json")));
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("..%2Fhistorical%2Fhydra-1943-12")]
    public async Task Should_return_not_found_When_no_sheet_has_the_id(string id)
    {
        // Arrange
        var client = CreateClient();

        // Act
        using var response = await client.GetAsync(Url($"/api/keysheets/{id}"), Token);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(Token);
        Assert.Equal("The key sheet was not found.", problem!.Title);
    }

    [Fact]
    public async Task Should_return_bad_request_When_an_imported_sheet_has_an_empty_kenngruppe()
    {
        // Arrange
        var client = CreateClient();
        var body = JsonSerializer.Deserialize<JsonElement>(WithKenngruppen("[\"ABC\", null]"));

        // Act
        using var response = await client.PostAsJsonAsync(Url("/api/keysheets/import"), body, Token);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    public static TheoryData<string, string> UnreadableUserFiles => new()
    {
        { "broken.json", "{ not json" },
        { "null-kenngruppe.json", WithKenngruppen("[null]") },
        { ".json", HistoricalJson },
    };

    [Theory]
    [MemberData(nameof(UnreadableUserFiles))]
    public async Task Should_skip_the_file_When_a_user_sheet_cannot_be_read(string fileName, string json)
    {
        // Arrange
        Directory.CreateDirectory(UserPath);
        await File.WriteAllTextAsync(Path.Combine(UserPath, fileName), json, Token);
        var client = CreateClient();

        // Act
        var sheets = await client.GetFromJsonAsync<List<KeySheetSummary>>(Url("/api/keysheets"), Token);

        // Assert
        Assert.Equal(["historical-hydra-1943-12"], sheets!.Select(s => s.Id));
    }

    private static string WithKenngruppen(string kenngruppen) =>
        HistoricalJson.Replace("\"plugs\"", $"\"kenngruppen\": {kenngruppen}, \"plugs\"", StringComparison.Ordinal);

    private static Uri Url(string path) => new(path, UriKind.Relative);

    private static async Task<T> SendAsync<T>(HttpClient client, HttpMethod method, string url, object body)
    {
        using var request = new HttpRequestMessage(method, Url(url)) { Content = JsonContent.Create(body) };
        using var response = await client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(Token)
            ?? throw new InvalidOperationException("Empty response.");
    }

    private HttpClient CreateClient()
    {
        var root = new WebApplicationFactory<Program>();
        var factory = root.WithWebHostBuilder(builder => builder
            .UseSetting("KeySheets:HistoricalPath", HistoricalPath)
            .UseSetting("KeySheets:UserPath", UserPath));
        var client = factory.CreateClient();
        _disposables.AddRange([client, factory, root]);
        return client;
    }
}
