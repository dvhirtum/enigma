using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Enigma.Application.KeySheets;
using Enigma.Application.Machine;
using Microsoft.AspNetCore.Mvc;

namespace Enigma.Api.Tests;

public sealed class KeySheetEndpointTests : IDisposable
{
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

    private readonly List<IDisposable> _disposables = [];

    private readonly string _root = Directory.CreateTempSubdirectory("enigma-keysheets-").FullName;

    public KeySheetEndpointTests()
    {
        Directory.CreateDirectory(HistoricalPath);
        File.WriteAllText(Path.Combine(HistoricalPath, "hydra-1943-12.json"), HistoricalJson);
    }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    private string HistoricalPath => Path.Combine(_root, "historical");

    private string UserPath => Path.Combine(_root, "user");

    public static TheoryData<string, string> UnreadableUserFiles => new()
    {
        { "broken.json", "{ not json" },
        { "bad-grundstellung.json", WithGrundstellung("\"A1B\"") },
        { ".json", HistoricalJson }
    };

    public void Dispose()
    {
        foreach (var disposable in _disposables) disposable.Dispose();

        Directory.Delete(_root, true);
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
    public async Task Should_keep_imported_sheets_in_the_user_folder_When_the_api_restarts()
    {
        // Arrange
        var imported = await SendAsync<KeySheetDetails>(
            CreateClient(), HttpMethod.Post, "/api/keysheets/import",
            JsonSerializer.Deserialize<JsonElement>(HistoricalJson));

        // Act
        var reloaded =
            await CreateClient().GetFromJsonAsync<KeySheetDetails>(Url($"/api/keysheets/{imported.Id}"), Token);

        // Assert
        Assert.True(File.Exists(Path.Combine(UserPath, imported.Id + ".json")));
        Assert.Equal("Hydra", reloaded!.Network);
        Assert.Equal([26], reloaded.Days.Select(d => d.Day));
    }

    [Fact]
    public async Task Should_generate_import_and_delete_sheets_When_each_endpoint_is_called()
    {
        // Arrange
        var client = CreateClient();
        var imported = await SendAsync<KeySheetDetails>(
            client, HttpMethod.Post, "/api/keysheets/import", JsonSerializer.Deserialize<JsonElement>(HistoricalJson));

        // Act
        var generated = await SendAsync<List<KeySheetSummary>>(
            client, HttpMethod.Post, "/api/keysheets/generate", new { model = "M4", year = 1944 });
        using var deleted = await client.DeleteAsync(Url($"/api/keysheets/{imported.Id}"), Token);
        var sheets = await client.GetFromJsonAsync<List<KeySheetSummary>>(Url("/api/keysheets"), Token);

        // Assert
        Assert.Equal(120, generated.Count);
        Assert.All(generated, s => Assert.Equal("Generated", s.Provenance));
        Assert.Equal("UserDefined", imported.Provenance);
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal("historical-hydra-1943-12", sheets![0].Id);
        Assert.Equal(generated.Select(s => s.Id).Order(), sheets.Skip(1).Select(s => s.Id).Order());
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
        Assert.Equal(new AppliedKeyState("historical-hydra-1943-12", "Hydra", "1943-12", 26, false, null),
            state.AppliedKey! with { Grundstellung = null });
        Assert.Matches("^[A-Z]{3}$", state.AppliedKey.Grundstellung);
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
        Assert.Matches(
            "\"appliedKey\":\\{\"sheetId\":\"historical-hydra-1943-12\",\"network\":\"Hydra\",\"month\":\"1943-12\",\"day\":26,\"modified\":true,\"grundstellung\":\"[A-Z]{3}\"\\}",
            json);
    }

    [Fact]
    public async Task Should_return_problem_details_When_the_year_is_generated_again()
    {
        // Arrange
        var client = CreateClient();
        await SendAsync<List<KeySheetSummary>>(client, HttpMethod.Post, "/api/keysheets/generate",
            new { model = "M3", year = 1944 });

        // Act
        using var response =
            await client.PostAsJsonAsync(Url("/api/keysheets/generate"), new { model = "M3", year = 1944 }, Token);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(Token);
        Assert.Equal("The operation was rejected.", problem!.Title);
        Assert.Equal("Generated M3 key sheets for 1944 already exist.", problem.Detail);
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
    public async Task Should_return_bad_request_When_an_imported_sheet_has_a_bad_Grundstellung()
    {
        // Arrange
        var client = CreateClient();
        var body = JsonSerializer.Deserialize<JsonElement>(WithGrundstellung("\"AB\""));

        // Act
        using var response = await client.PostAsJsonAsync(Url("/api/keysheets/import"), body, Token);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

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

    private static string WithGrundstellung(string grundstellung)
    {
        return HistoricalJson.Replace("\"plugs\"", $"\"grundstellung\": {grundstellung}, \"plugs\"",
            StringComparison.Ordinal);
    }

    [Fact]
    public async Task Should_share_the_book_and_the_tables_When_a_sheet_is_exported_to_another_installation()
    {
        // Arrange
        var sender = CreateClient();
        var receiver = CreateClient(Path.Combine(_root, "other-user"));
        var generated = await SendAsync<List<KeySheetSummary>>(sender, HttpMethod.Post, "/api/keysheets/generate",
            new { model = "M4", year = 1942 });
        var created =
            (await sender.GetFromJsonAsync<KeySheetDetails>(Url($"/api/keysheets/{generated[0].Id}"), Token))!;
        var file = await sender.GetStringAsync(Url($"/api/keysheets/{created.Id}/export"), Token);

        // Act
        using var content = new StringContent(file, Encoding.UTF8, "application/json");
        using var response = await receiver.PostAsync(Url("/api/keysheets/import"), content, Token);

        // Assert
        response.EnsureSuccessStatusCode();
        var imported = (await response.Content.ReadFromJsonAsync<KeySheetDetails>(Token))!;
        Assert.Equal(created.KenngruppenbuchId, imported.KenngruppenbuchId);
        Assert.Equal(created.TauschtafelSetId, imported.TauschtafelSetId);
        Assert.Equal(
            await sender.GetStringAsync(Url($"/api/kenngruppenbuecher/{created.KenngruppenbuchId}"), Token),
            await receiver.GetStringAsync(Url($"/api/kenngruppenbuecher/{imported.KenngruppenbuchId}"), Token));
        Assert.Equal(
            await sender.GetStringAsync(Url($"/api/tauschtafeln/{created.TauschtafelSetId}"), Token),
            await receiver.GetStringAsync(Url($"/api/tauschtafeln/{imported.TauschtafelSetId}"), Token));
    }

    private static Uri Url(string path)
    {
        return new Uri(path, UriKind.Relative);
    }

    private static async Task<T> SendAsync<T>(HttpClient client, HttpMethod method, string url, object body)
    {
        using var request = new HttpRequestMessage(method, Url(url));
        request.Content = JsonContent.Create(body);
        using var response = await client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(Token)
               ?? throw new InvalidOperationException("Empty response.");
    }

    private HttpClient CreateClient(string? userPath = null)
    {
        var root = new ApiFactory();
        var factory = root.WithWebHostBuilder(builder => builder
            .UseSetting("KeySheets:HistoricalPath", HistoricalPath)
            .UseSetting("KeySheets:UserPath", userPath ?? UserPath));
        var client = factory.CreateClient();
        _disposables.AddRange([client, factory, root]);
        return client;
    }
}
