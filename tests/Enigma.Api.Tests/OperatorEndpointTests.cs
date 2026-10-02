using System.Net;
using System.Net.Http.Json;
using Enigma.Application.KeySheets;
using Enigma.Application.Machine;
using Enigma.Application.OperatorMode;
using Enigma.Application.Procedure;
using Microsoft.AspNetCore.Mvc;

namespace Enigma.Api.Tests;

public sealed class OperatorEndpointTests : IDisposable
{
    private const string HistoricalJson = """
        {
          "network": "Hydra",
          "month": "1943-12",
          "source": "Test transcription",
          "days": [
            { "day": 26, "reflector": "B", "rotors": ["III", "VI", "VIII"], "rings": [1, 8, 13],
              "plugs": ["AN", "EZ"], "grundstellung": "QRS" }
          ]
        }
        """;

    private static readonly string[] Slots = ["Left", "Middle", "Right"];

    private readonly string _root = Directory.CreateTempSubdirectory("enigma-operator-").FullName;
    private readonly List<IDisposable> _disposables = [];

    public OperatorEndpointTests()
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
    public async Task Should_keep_the_links_of_a_historical_sheet_When_the_backend_restarts()
    {
        // Arrange
        var first = await CreateClient().GetFromJsonAsync<KeySheetDetails>(Url("/api/keysheets/historical-hydra-1943-12"), Token);

        // Act
        var second = await CreateClient().GetFromJsonAsync<KeySheetDetails>(Url("/api/keysheets/historical-hydra-1943-12"), Token);

        // Assert
        Assert.NotNull(first!.KenngruppenbuchId);
        Assert.Equal(first.KenngruppenbuchId, second!.KenngruppenbuchId);
        Assert.Equal(first.TauschtafelSetId, second.TauschtafelSetId);
        Assert.True(File.Exists(Path.Combine(UserPath, "procedure", "historical-links.json")));
    }

    [Fact]
    public async Task Should_return_the_book_and_tables_When_a_linked_sheet_is_read()
    {
        // Arrange
        var client = CreateClient();
        var sheet = await client.GetFromJsonAsync<KeySheetDetails>(Url("/api/keysheets/historical-hydra-1943-12"), Token);

        // Act
        var book = await client.GetFromJsonAsync<KenngruppenbuchDocument>(Url($"/api/kenngruppenbuecher/{sheet!.KenngruppenbuchId}"), Token);
        var tables = await client.GetFromJsonAsync<TauschtafelSetDocument>(Url($"/api/tauschtafeln/{sheet.TauschtafelSetId}"), Token);

        // Assert
        Assert.Equal(676, book!.Columns.Count);
        Assert.Contains(book.Allotments, a => a.Network == "Hydra");
        Assert.Equal(new ColumnRangeDocument(1, 100), book.Verfahrenkenngruppen);
        Assert.Equal(1943, tables!.Year);
        Assert.Equal(9, tables.Tables.Count);
        Assert.All(tables.Tables, t => Assert.Equal(338, t.Swaps.Count));
    }

    [Fact]
    public async Task Should_return_not_found_When_the_book_does_not_exist()
    {
        // Arrange
        var client = CreateClient();

        // Act
        using var response = await client.GetAsync(Url("/api/kenngruppenbuecher/missing"), Token);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Should_return_bad_request_When_sending_starts_without_a_daily_key()
    {
        // Arrange
        var client = CreateClient();

        // Act
        using var response = await client.PostAsync(Url("/api/operator/send"), null, Token);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(Token);
        Assert.Equal("Apply a daily key first.", problem!.Detail);
    }

    [Fact]
    public async Task Should_decrypt_the_message_When_a_message_sent_over_the_api_is_received()
    {
        // Arrange
        var client = CreateClient();
        var sheet = await client.GetFromJsonAsync<KeySheetDetails>(Url("/api/keysheets/historical-hydra-1943-12"), Token);
        var book = await client.GetFromJsonAsync<KenngruppenbuchDocument>(Url($"/api/kenngruppenbuecher/{sheet!.KenngruppenbuchId}"), Token);
        var hydra = book!.Allotments.Single(a => a.Network == "Hydra");
        var schluessel = book.Columns[hydra.First - 1][..3];
        var verfahren = book.Columns[0][4..7];
        await Send(client, HttpMethod.Post, "/api/machine/daily-key", new { sheetId = sheet.Id, day = 26 });
        await Send(client, HttpMethod.Post, "/api/operator/send", null);
        await Send(client, HttpMethod.Put, "/api/operator/groups", new { schluesselkenngruppe = schluessel, verfahrenkenngruppe = verfahren, fillers = "QX" });
        await SetUpMessageKey(client, verfahren);
        await Type(client, "ANGRIFF");
        await Type(client, "X");
        var sent = await Send(client, HttpMethod.Post, "/api/operator/finish", null);
        await Send(client, HttpMethod.Post, "/api/machine", new { model = "M4" });

        // Act
        using var found = await client.PostAsJsonAsync(
            Url("/api/operator/receiving-keys"), new { message = sent.Operator!.Message, date = "1943-12-26" }, Token);
        var keys = await found.Content.ReadFromJsonAsync<List<ReceivingKey>>(Token);
        var received = await Send(client, HttpMethod.Post, "/api/operator/receive", new { message = sent.Operator.Message, sheetId = keys![0].SheetId, day = keys[0].Day });
        await SetUpMessageKey(client, received.Operator!.Verfahrenkenngruppe!);
        var plaintext = await Type(client, received.Operator.CipherText!);

        // Assert
        Assert.Equal("Done", sent.Operator.Step);
        Assert.Equal(new ReceivingKey(sheet.Id, "Hydra", "1943-12", 26, "M3", schluessel), Assert.Single(keys));
        Assert.Equal(schluessel, received.Operator.Schluesselkenngruppe);
        Assert.Equal("ANGRIFFX", plaintext);
    }

    [Fact]
    public async Task Should_stop_the_procedure_When_the_operator_cancels()
    {
        // Arrange
        var client = CreateClient();
        await Send(client, HttpMethod.Post, "/api/machine/daily-key", new { sheetId = "historical-hydra-1943-12", day = 26 });
        var sending = await Send(client, HttpMethod.Post, "/api/operator/send", null);

        // Act
        var cancelled = await Send(client, HttpMethod.Delete, "/api/operator", null);

        // Assert
        Assert.Equal("ChooseGroups", sending.Operator?.Step);
        Assert.Null(cancelled.Operator);
    }

    [Fact]
    public async Task Should_keep_the_filled_in_Grundstellung_of_a_historical_sheet_When_the_backend_restarts()
    {
        // Arrange
        await File.WriteAllTextAsync(
            Path.Combine(HistoricalPath, "hydra-old.json"), HistoricalJson.Replace(", \"grundstellung\": \"QRS\"", string.Empty, StringComparison.Ordinal), Token);
        var first = await CreateClient().GetFromJsonAsync<KeySheetDetails>(Url("/api/keysheets/historical-hydra-old"), Token);

        // Act
        var second = await CreateClient().GetFromJsonAsync<KeySheetDetails>(Url("/api/keysheets/historical-hydra-old"), Token);

        // Assert
        var grundstellung = Assert.Single(first!.Days).Grundstellung;
        Assert.Matches("^[A-Z]{3}$", grundstellung);
        Assert.Equal(grundstellung, Assert.Single(second!.Days).Grundstellung);
    }

    private static async Task SetUpMessageKey(HttpClient client, string verfahren)
    {
        await Set(client, "QRS");
        await Set(client, await Type(client, verfahren));
    }

    private static async Task Set(HttpClient client, string positions)
    {
        foreach (var (slot, position) in Slots.Zip(positions))
        {
            await Send(client, HttpMethod.Put, $"/api/machine/rotors/{slot}/position", new { position = position.ToString() });
        }
    }

    private static async Task<string> Type(HttpClient client, string keys)
    {
        var lamps = string.Empty;
        foreach (var key in keys)
        {
            lamps += (await Send(client, HttpMethod.Post, "/api/machine/keyboard/press", new { key = key.ToString() })).LitLamp;
            await Send(client, HttpMethod.Post, "/api/machine/keyboard/release", null);
        }

        return lamps;
    }

    private static Uri Url(string path) => new(path, UriKind.Relative);

    private static async Task<MachineState> Send(HttpClient client, HttpMethod method, string url, object? body)
    {
        using var request = new HttpRequestMessage(method, Url(url));
        request.Content = body is null ? null : JsonContent.Create(body);
        using var response = await client.SendAsync(request, Token);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<MachineState>(Token)
            ?? throw new InvalidOperationException("Empty response.");
    }

    private HttpClient CreateClient()
    {
        var root = new ApiFactory();
        var factory = root.WithWebHostBuilder(builder => builder
            .UseSetting("KeySheets:HistoricalPath", HistoricalPath)
            .UseSetting("KeySheets:UserPath", UserPath));
        var client = factory.CreateClient();
        _disposables.AddRange([client, factory, root]);
        return client;
    }
}
