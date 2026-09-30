using Enigma.Application.Bombe;
using Enigma.Domain.Bombe;

namespace Enigma.Infrastructure.Bombe;

/// <summary>Keeps one Bombe job, its latest run and its stops in memory.</summary>
public sealed class InMemoryBombeSessionStore : IBombeSessionStore
{
    private readonly Lock _lock = new();
    private readonly BombeJob _job = new();

    public BombeRun? Run { get; set; }

    public StopLog Stops { get; } = new();

    public T Use<T>(Func<BombeJob, T> action)
    {
        ArgumentNullException.ThrowIfNull(action);

        lock (_lock)
        {
            return action(_job);
        }
    }
}
