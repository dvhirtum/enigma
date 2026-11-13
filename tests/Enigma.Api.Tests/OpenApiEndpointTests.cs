using System.Net;
using System.Text.Json;

namespace Enigma.Api.Tests;

public sealed class OpenApiEndpointTests(ApiFactory factory)
    : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Should_describe_every_operation_with_a_summary_When_the_document_is_requested_in_development()
    {
        // Arrange
        using var client = factory.CreateClient();

        // Act
        using var response = await client.GetAsync(new Uri("/openapi/v1.json", UriKind.Relative),
            TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        var operations = document.RootElement.GetProperty("paths").EnumerateObject()
            .SelectMany(path => path.Value.EnumerateObject())
            .ToList();
        Assert.NotEmpty(operations);
        Assert.All(operations, operation => Assert.True(operation.Value.TryGetProperty("summary", out _),
            $"{operation.Name} has no summary."));
    }
}
