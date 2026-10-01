using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Machine;

/// <summary>
/// Holds the current machine, the daily key it was set up with and the running operator procedure. Calls run one at
/// a time.
/// </summary>
public interface IMachineSessionStore
{
    /// <summary>The daily key applied to the current machine, or null.</summary>
    AppliedKey? AppliedKey { get; }

    /// <summary>The running operator procedure, or null. Set it only inside <see cref="Use{T}"/>.</summary>
    OperatorProcedure? Procedure { get; set; }

    /// <summary>
    /// Every lamp lit since the record was last cleared, oldest first; a new machine keeps it. Set it only inside
    /// <see cref="Use{T}"/>.
    /// </summary>
    string Lamps { get; set; }

    /// <summary>Runs <paramref name="action"/> on the current machine.</summary>
    T Use<T>(Func<EnigmaMachine, T> action);

    /// <summary>Replaces the current machine, set up with <paramref name="appliedKey"/> if given, and ends the procedure.</summary>
    void Replace(EnigmaMachine machine, AppliedKey? appliedKey = null);
}
