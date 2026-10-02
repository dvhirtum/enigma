using Enigma.Application.Machine;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Infrastructure.Machine;

/// <summary>Keeps one machine in memory, starting as a default M3.</summary>
public sealed class InMemoryMachineSessionStore : IMachineSessionStore
{
    private readonly Lock _lock = new();
    private EnigmaMachine _machine = EnigmaMachine.Create(MachineModel.M3);

    public AppliedKey? AppliedKey { get; private set; }

    public OperatorProcedure? Procedure { get; set; }

    public string Lamps { get; set; } = string.Empty;

    public T Use<T>(Func<EnigmaMachine, T> action)
    {
        ArgumentNullException.ThrowIfNull(action);

        lock (_lock)
        {
            return action(_machine);
        }
    }

    public void Replace(EnigmaMachine machine, AppliedKey? appliedKey = null)
    {
        ArgumentNullException.ThrowIfNull(machine);

        lock (_lock)
        {
            _machine = machine;
            AppliedKey = appliedKey;
            Procedure = null;
        }
    }
}
