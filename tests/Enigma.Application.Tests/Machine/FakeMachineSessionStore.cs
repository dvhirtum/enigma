using Enigma.Application.Machine;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.Machine;

internal sealed class FakeMachineSessionStore(EnigmaMachine machine) : IMachineSessionStore
{
    public FakeMachineSessionStore()
        : this(EnigmaMachine.Create(MachineModel.M3))
    {
    }

    public EnigmaMachine Machine { get; private set; } = machine;

    public AppliedKey? AppliedKey { get; private set; }

    public OperatorProcedure? Procedure { get; set; }

    public T Use<T>(Func<EnigmaMachine, T> action) => action(Machine);

    public void Replace(EnigmaMachine machine, AppliedKey? appliedKey = null)
    {
        Machine = machine;
        AppliedKey = appliedKey;
        Procedure = null;
    }
}
