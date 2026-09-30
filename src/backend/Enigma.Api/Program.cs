using System.Reflection;
using System.Text.Json.Serialization;
using Enigma.Api;
using Enigma.Application.Bombe;
using Enigma.Application.KeySheets;
using Enigma.Application.Machine;
using Enigma.Application.OperatorMode;
using Enigma.Application.Procedure;
using Enigma.Infrastructure.Bombe;
using Enigma.Infrastructure.Machine;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

var builder = WebApplication.CreateSlimBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, ApiJsonContext.Default));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
builder.Services.AddSingleton<IMachineSessionStore, InMemoryMachineSessionStore>();
builder.Services.AddMachineHandlers();
builder.Services.AddKeySheets(builder.Configuration);
builder.Services.AddOperatorHandlers();
builder.Services.AddSingleton<IBombeSessionStore, InMemoryBombeSessionStore>();
builder.Services.AddBombeHandlers();

var app = builder.Build();

app.UseExceptionHandler();

var version = typeof(Program).Assembly
    .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "0.0.0";

app.MapGet("/api/health", () => new HealthResponse("ok", version));
app.MapMachineEndpoints();
app.MapKeySheetEndpoints();
app.MapOperatorEndpoints();
app.MapBombeEndpoints();

app.Lifetime.ApplicationStarted.Register(() =>
{
    var address = app.Services.GetRequiredService<IServer>()
        .Features.Get<IServerAddressesFeature>()?.Addresses.FirstOrDefault();

    if (address is not null)
    {
        Console.WriteLine($"ENIGMA_API_PORT={new Uri(address).Port}");
    }
});

await app.RunAsync();

internal sealed record HealthResponse(string Status, string Version);

[JsonSerializable(typeof(HealthResponse))]
[JsonSerializable(typeof(MachineState))]
[JsonSerializable(typeof(CreateMachine))]
[JsonSerializable(typeof(SetUpMachine))]
[JsonSerializable(typeof(RotorRequest))]
[JsonSerializable(typeof(SetReflector))]
[JsonSerializable(typeof(ConnectPlug))]
[JsonSerializable(typeof(PressKey))]
[JsonSerializable(typeof(RingSettingRequest))]
[JsonSerializable(typeof(PositionRequest))]
[JsonSerializable(typeof(PlugMoveRequest))]
[JsonSerializable(typeof(DailyKeyRequest))]
[JsonSerializable(typeof(GenerateKeySheets))]
[JsonSerializable(typeof(KeySheetDocument))]
[JsonSerializable(typeof(KeySheetDetails))]
[JsonSerializable(typeof(IReadOnlyList<KeySheetSummary>))]
[JsonSerializable(typeof(KenngruppenbuchDocument))]
[JsonSerializable(typeof(TauschtafelSetDocument))]
[JsonSerializable(typeof(FindReceivingKeys))]
[JsonSerializable(typeof(IReadOnlyList<ReceivingKey>))]
[JsonSerializable(typeof(StartReceiving))]
[JsonSerializable(typeof(ChooseGroups))]
[JsonSerializable(typeof(BombeState))]
[JsonSerializable(typeof(RunState))]
[JsonSerializable(typeof(IReadOnlyList<StopState>))]
[JsonSerializable(typeof(SetCipherText))]
[JsonSerializable(typeof(SetCrib))]
[JsonSerializable(typeof(PlacementRequest))]
[JsonSerializable(typeof(SetMenu))]
[JsonSerializable(typeof(ConfigureBombe))]
[JsonSerializable(typeof(SpeedRequest))]
[JsonSerializable(typeof(DrumsRequest))]
[JsonSerializable(typeof(StartRequest))]
[JsonSerializable(typeof(IReadOnlyList<InterceptState>))]
[JsonSerializable(typeof(LoadIntercept))]
[JsonSerializable(typeof(CribState))]
[JsonSerializable(typeof(SolutionState))]
[JsonSerializable(typeof(CheckState))]
[JsonSerializable(typeof(CheckRequest))]
[JsonSerializable(typeof(KeyRequest))]
[JsonSerializable(typeof(LampState))]
[JsonSerializable(typeof(VerdictRequest))]
[JsonSerializable(typeof(ConfirmationState))]
[JsonSerializable(typeof(SuggestionState))]
[JsonSerializable(typeof(FindState))]
internal sealed partial class ApiJsonContext : JsonSerializerContext;
