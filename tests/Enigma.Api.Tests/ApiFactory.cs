using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Enigma.Api.Tests;

/// <summary>
///     Hosts the API with only its source-generated JSON contexts, as in the Native AOT build,
///     so a type missing from <c>ApiJsonContext</c> fails here as well.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services => services.PostConfigure<JsonOptions>(options =>
        {
            var chain = options.SerializerOptions.TypeInfoResolverChain;
            for (var index = chain.Count - 1; index >= 0; index--)
                if (chain[index] is not JsonSerializerContext)
                    chain.RemoveAt(index);
        }));
    }
}
