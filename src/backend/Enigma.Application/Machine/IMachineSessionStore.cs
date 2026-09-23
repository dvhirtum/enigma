using Enigma.Domain.Machine;

namespace Enigma.Application.Machine;

/// <summary>Holds the current machine. Calls run one at a time.</summary>
public interface IMachineSessionStore
{
    /// <summary>Runs <paramref name="action"/> on the current machine.</summary>
    T Use<T>(Func<EnigmaMachine, T> action);

    /// <summary>Replaces the current machine.</summary>
    void Replace(EnigmaMachine machine);
}
