using Enigma.Domain.Bombe;

namespace Enigma.Application.Bombe;

/// <summary>Holds the Bombe job and its latest run. Calls run one at a time.</summary>
public interface IBombeSessionStore
{
    /// <summary>The latest run, or null. Set it only inside <see cref="Use{T}"/>.</summary>
    BombeRun? Run { get; set; }

    /// <summary>Runs <paramref name="action"/> on the job.</summary>
    T Use<T>(Func<BombeJob, T> action);
}
