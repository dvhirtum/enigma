using System.Reflection;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

var builder = WebApplication.CreateSlimBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, ApiJsonContext.Default));

var app = builder.Build();

var version = typeof(Program).Assembly
    .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "0.0.0";

app.MapGet("/api/health", () => new HealthResponse("ok", version));

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
internal sealed partial class ApiJsonContext : JsonSerializerContext;
