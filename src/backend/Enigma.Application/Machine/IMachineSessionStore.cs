using Enigma.Domain.Machine;

namespace Enigma.Application.Machine;

/// <summary>Holds the current machine and the daily key it was set up with. Calls run one at a time.</summary>
public interface IMachineSessionStore
{
    /// <summary>The daily key applied to the current machine, or null.</summary>
    AppliedKey? AppliedKey { get; }

    /// <summary>Runs <paramref name="action"/> on the current machine.</summary>
    T Use<T>(Func<EnigmaMachine, T> action);

    /// <summary>Replaces the current machine, set up with <paramref name="appliedKey"/> if given.</summary>
    void Replace(EnigmaMachine machine, AppliedKey? appliedKey = null);
}
