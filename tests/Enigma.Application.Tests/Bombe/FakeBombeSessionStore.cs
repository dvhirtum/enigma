using Enigma.Application.Bombe;
using Enigma.Domain.Bombe;

namespace Enigma.Application.Tests.Bombe;

internal sealed class FakeBombeSessionStore : IBombeSessionStore
{
    public BombeJob Job { get; } = new();

    public BombeRun? Run { get; set; }

    public StopLog Stops { get; } = new();

    public Printout Printout { get; } = new();

    public T Use<T>(Func<BombeJob, T> action) => action(Job);
}
