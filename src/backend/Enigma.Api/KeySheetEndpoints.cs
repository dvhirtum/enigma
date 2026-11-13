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
    ///     Kenngruppenbücher, Tauschtafel sets, Stichwort sets and weather tables in its <c>procedure</c> folder.
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
            .AddSingleton<IStichwortSetRepository>(
                new JsonStichwortSetRepository(Path.Combine(userPath, "procedure", "stichwoerter")))
            .AddSingleton<IWetterTafelSetRepository>(
                new JsonWetterTafelSetRepository(Path.Combine(userPath, "procedure", "wettertafeln")))
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
        var sheets = app.MapGroup("/api/keysheets")
            .WithTags("Key sheets")
            .ProducesProblem(StatusCodes.Status400BadRequest);

        sheets.MapGet("/", (ListKeySheetsHandler handler) =>
                handler.Handle(new ListKeySheets()))
            .WithSummary("Lists the key sheets.");

        sheets.MapGet("/{id}", (string id, GetKeySheetHandler handler) =>
                handler.Handle(new GetKeySheet(id)))
            .WithSummary("Gets a key sheet with its daily keys.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        sheets.MapDelete("/{id}", (string id, DeleteKeySheetHandler handler) =>
            {
                handler.Handle(new DeleteKeySheet(id));
                return Results.NoContent();
            })
            .WithSummary("Deletes a generated or user-defined key sheet.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        sheets.MapPost("/generate", (GenerateKeySheets command, GenerateKeySheetsHandler handler) =>
                handler.Handle(command))
            .WithSummary("Generates every month of a year for each network, for one model.");

        sheets.MapPost("/import", (KeySheetDocument document, ImportKeySheetHandler handler) =>
                handler.Handle(new ImportKeySheet(document)))
            .WithSummary("Imports a key sheet file as a user-defined sheet.");

        sheets.MapGet("/{id}/export", (string id, ExportKeySheetHandler handler) =>
                handler.Handle(new ExportKeySheet(id)))
            .WithSummary("Exports a key sheet file with its linked books and tables.")
            .ProducesProblem(StatusCodes.Status404NotFound);

        var procedure = app.MapGroup("/api")
            .WithTags("Key procedure")
            .ProducesProblem(StatusCodes.Status404NotFound);

        procedure.MapGet("/kenngruppenbuecher/{id}", (string id, GetKenngruppenbuchHandler handler) =>
                handler.Handle(new GetKenngruppenbuch(id)))
            .WithSummary("Gets a Kenngruppenbuch with its Zuteilungsliste.");

        procedure.MapGet("/tauschtafeln/{id}", (string id, GetTauschtafelSetHandler handler) =>
                handler.Handle(new GetTauschtafelSet(id)))
            .WithSummary("Gets a year's set of bigram tables with its calendar.");

        procedure.MapGet("/wetterkurzschluessel", YearlyProcedureMapper.Wetterkurzschluessel)
            .WithSummary("Gets the weather short-signal book.");

        app.MapPost("/api/machine/daily-key", (DailyKeyRequest request, ApplyDailyKeyHandler handler) =>
                handler.Handle(new ApplyDailyKey(request.SheetId, request.Day)))
            .WithTags("Machine")
            .WithSummary("Sets up the machine with a key sheet day, switching model if needed.")
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }
}
