using System.Reflection;
using System.Text.Json.Serialization;
using Enigma.Api;
using Enigma.Application.Machine;
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

var app = builder.Build();

app.UseExceptionHandler();

var version = typeof(Program).Assembly
    .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "0.0.0";

app.MapGet("/api/health", () => new HealthResponse("ok", version));
app.MapMachineEndpoints();

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
[JsonSerializable(typeof(InsertRotors))]
[JsonSerializable(typeof(SetReflector))]
[JsonSerializable(typeof(ConnectPlug))]
[JsonSerializable(typeof(PressKey))]
[JsonSerializable(typeof(RingSettingRequest))]
[JsonSerializable(typeof(PositionRequest))]
[JsonSerializable(typeof(PlugMoveRequest))]
internal sealed partial class ApiJsonContext : JsonSerializerContext;
