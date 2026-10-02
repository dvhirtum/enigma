using Enigma.Application.KeySheets;
using Enigma.Application.Procedure;
using Enigma.Infrastructure.KeySheets;
using Enigma.Infrastructure.Procedure;

namespace Enigma.Api;

internal sealed record DailyKeyRequest(string SheetId, int Day);

internal static class KeySheetEndpoints
{
    /// <summary>
    ///     Historical sheets come from <c>KeySheets:HistoricalPath</c> (default: <c>keysheets</c> next to the executable),
    ///     others are stored in <c>KeySheets:UserPath</c> (default: <c>Enigma/keysheets</c> in local app data), with the
    ///     Kenngruppenbücher and Tauschtafel sets in its <c>procedure</c> folder.
    /// </summary>
    public static IServiceCollection AddKeySheets(this IServiceCollection services, IConfiguration configuration)
    {
        var historicalPath = configuration["KeySheets:HistoricalPath"]
                             ?? Path.Combine(AppContext.BaseDirectory, "keysheets");
        var userPath = configuration["KeySheets:UserPath"]
                       ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                           "Enigma", "keysheets");

        return services
            .AddSingleton<IKeySheetRepository>(new JsonKeySheetRepository(historicalPath, userPath))
            .AddSingleton<IKenngruppenbuchRepository>(
                new JsonKenngruppenbuchRepository(Path.Combine(userPath, "procedure", "books")))
            .AddSingleton<ITauschtafelSetRepository>(
                new JsonTauschtafelSetRepository(Path.Combine(userPath, "procedure", "tables")))
            .AddSingleton(Random.Shared)
            .AddSingleton(TimeProvider.System)
            .AddSingleton<KeySheetLinker>()
            .AddSingleton<GetKenngruppenbuchHandler>()
            .AddSingleton<GetTauschtafelSetHandler>()
            .AddSingleton<ListKeySheetsHandler>()
            .AddSingleton<GetKeySheetHandler>()
            .AddSingleton<DeleteKeySheetHandler>()
            .AddSingleton<GenerateKeySheetsHandler>()
            .AddSingleton<ImportKeySheetHandler>()
            .AddSingleton<ExportKeySheetHandler>()
            .AddSingleton<ApplyDailyKeyHandler>();
    }

    public static void MapKeySheetEndpoints(this IEndpointRouteBuilder app)
    {
        var sheets = app.MapGroup("/api/keysheets");

        sheets.MapGet("/", (ListKeySheetsHandler handler) =>
            handler.Handle(new ListKeySheets()));

        sheets.MapGet("/{id}", (string id, GetKeySheetHandler handler) =>
            handler.Handle(new GetKeySheet(id)));

        sheets.MapDelete("/{id}", (string id, DeleteKeySheetHandler handler) =>
        {
            handler.Handle(new DeleteKeySheet(id));
            return Results.NoContent();
        });

        sheets.MapPost("/generate", (GenerateKeySheets command, GenerateKeySheetsHandler handler) =>
            handler.Handle(command));

        sheets.MapPost("/import", (KeySheetDocument document, ImportKeySheetHandler handler) =>
            handler.Handle(new ImportKeySheet(document)));

        sheets.MapGet("/{id}/export", (string id, ExportKeySheetHandler handler) =>
            handler.Handle(new ExportKeySheet(id)));

        app.MapGet("/api/kenngruppenbuecher/{id}", (string id, GetKenngruppenbuchHandler handler) =>
            handler.Handle(new GetKenngruppenbuch(id)));

        app.MapGet("/api/tauschtafeln/{id}", (string id, GetTauschtafelSetHandler handler) =>
            handler.Handle(new GetTauschtafelSet(id)));

        app.MapPost("/api/machine/daily-key", (DailyKeyRequest request, ApplyDailyKeyHandler handler) =>
            handler.Handle(new ApplyDailyKey(request.SheetId, request.Day)));
    }
}
