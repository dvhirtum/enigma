using Enigma.Application.KeySheets;
using Enigma.Application.Machine;
using Enigma.Infrastructure.KeySheets;

namespace Enigma.Api;

internal sealed record KeySheetRequest(string Network, string Month, string Text);

internal sealed record DailyKeyRequest(string SheetId, int Day);

internal static class KeySheetEndpoints
{
    /// <summary>
    /// Historical sheets come from <c>KeySheets:HistoricalPath</c> (default: <c>keysheets</c> next to the executable),
    /// others are stored in <c>KeySheets:UserPath</c> (default: <c>Enigma/keysheets</c> in local app data).
    /// </summary>
    public static IServiceCollection AddKeySheets(this IServiceCollection services, IConfiguration configuration)
    {
        var historicalPath = configuration["KeySheets:HistoricalPath"]
            ?? Path.Combine(AppContext.BaseDirectory, "keysheets");
        var userPath = configuration["KeySheets:UserPath"]
            ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Enigma", "keysheets");

        return services
            .AddSingleton<IKeySheetRepository>(new JsonKeySheetRepository(historicalPath, userPath))
            .AddSingleton(Random.Shared)
            .AddSingleton<ListKeySheetsHandler>()
            .AddSingleton<GetKeySheetHandler>()
            .AddSingleton<CreateKeySheetHandler>()
            .AddSingleton<UpdateKeySheetHandler>()
            .AddSingleton<DeleteKeySheetHandler>()
            .AddSingleton<GenerateKeySheetHandler>()
            .AddSingleton<ImportKeySheetHandler>()
            .AddSingleton<ApplyDailyKeyHandler>();
    }

    public static void MapKeySheetEndpoints(this IEndpointRouteBuilder app)
    {
        var sheets = app.MapGroup("/api/keysheets");

        sheets.MapGet("/", (ListKeySheetsHandler handler) =>
            handler.Handle(new ListKeySheets()));

        sheets.MapGet("/{id}", (string id, GetKeySheetHandler handler) =>
            handler.Handle(new GetKeySheet(id)));

        sheets.MapPost("/", (KeySheetRequest request, CreateKeySheetHandler handler) =>
            handler.Handle(new CreateKeySheet(request.Network, request.Month, request.Text)));

        sheets.MapPut("/{id}", (string id, KeySheetRequest request, UpdateKeySheetHandler handler) =>
            handler.Handle(new UpdateKeySheet(id, request.Network, request.Month, request.Text)));

        sheets.MapDelete("/{id}", (string id, DeleteKeySheetHandler handler) =>
        {
            handler.Handle(new DeleteKeySheet(id));
            return Results.NoContent();
        });

        sheets.MapPost("/generate", (GenerateKeySheet command, GenerateKeySheetHandler handler) =>
            handler.Handle(command));

        sheets.MapPost("/import", (KeySheetDocument document, ImportKeySheetHandler handler) =>
            handler.Handle(new ImportKeySheet(document)));

        app.MapPost("/api/machine/daily-key", (DailyKeyRequest request, ApplyDailyKeyHandler handler) =>
            handler.Handle(new ApplyDailyKey(request.SheetId, request.Day)));
    }
}
