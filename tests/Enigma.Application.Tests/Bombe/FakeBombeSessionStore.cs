using Enigma.Application.Bombe;
using Enigma.Domain.Bombe;

namespace Enigma.Application.Tests.Bombe;

internal sealed class FakeBombeSessionStore : IBombeSessionStore
{
    public BombeJob Job { get; } = new();

    public BombeRun? Run { get; set; }

    public T Use<T>(Func<BombeJob, T> action) => action(Job);
}
