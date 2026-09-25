using Enigma.Application.KeySheets;
using Enigma.Application.Procedure;
using Enigma.Domain.Machine;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Enigma.Api;

/// <summary>Returns invariant violations as 400 ProblemDetails, and unknown key sheets, books and table sets as 404.</summary>
internal sealed class DomainExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, title) = exception switch
        {
            DomainException => (StatusCodes.Status400BadRequest, "The operation was rejected."),
            KeySheetNotFoundException => (StatusCodes.Status404NotFound, "The key sheet was not found."),
            NotFoundException => (StatusCodes.Status404NotFound, "Not found."),
            _ => (0, string.Empty),
        };
        if (status == 0)
        {
            return false;
        }

        httpContext.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = status,
                Title = title,
                Detail = exception.Message,
            },
        }).ConfigureAwait(false);
    }
}
