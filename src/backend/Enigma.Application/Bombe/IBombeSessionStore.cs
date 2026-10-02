using Enigma.Domain.Bombe;

namespace Enigma.Application.Bombe;

/// <summary>
///     Holds the Bombe job, its latest run, the stops logged for the notebook and the printout. Calls run one at a
///     time.
/// </summary>
public interface IBombeSessionStore
{
    /// <summary>The latest run, or null. Set it only inside <see cref="Use{T}" />.</summary>
    BombeRun? Run { get; set; }

    /// <summary>The stops of the runs made for the Hut 8 notebook.</summary>
    StopLog Stops { get; }

    /// <summary>The stops the Bombe printed.</summary>
    Printout Printout { get; }

    /// <summary>Runs <paramref name="action" /> on the job.</summary>
    T Use<T>(Func<BombeJob, T> action);
}
