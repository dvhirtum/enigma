using Enigma.Application.Machine;
using Enigma.Application.Procedure;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.OperatorMode;

/// <summary>Builds the procedure's context from the applied daily key and its sheet's book and table set.</summary>
public sealed class OperatorContexts(IMachineSessionStore store, KeySheetLinker linker)
{
    public OperatorContext ForAppliedKey()
    {
        var applied = store.AppliedKey ?? throw new DomainException("Apply a daily key first.");
        var grundstellung = applied.Key.Grundstellung
            ?? throw new DomainException($"Day {applied.Key.Day} of {applied.Network} {applied.Month} has no Grundstellung.");
        var sheet = linker.Load(applied.SheetId);
        var book = linker.Book(sheet.KenngruppenbuchId!);
        var table = linker.Tables(sheet.TauschtafelSetId!).TableFor(KeyMonth.Parse(applied.Month), applied.Key.Day);
        return new OperatorContext(applied.Network, grundstellung, book, table);
    }
}

public sealed class StartSendingHandler(IMachineSessionStore store, OperatorContexts contexts, Random random, TimeProvider time)
{
    public MachineState Handle(StartSending command)
    {
        var context = contexts.ForAppliedKey();
        var procedure = OperatorProcedure.StartSending(
            context, TimeOnly.FromDateTime(time.GetLocalNow().DateTime), RandomLetter(), RandomLetter());
        return store.Begin(procedure);
    }

    private Letter RandomLetter() => Letter.FromIndex(random.Next(Letter.Count));
}

public sealed class StartReceivingHandler(IMachineSessionStore store, OperatorContexts contexts)
{
    public MachineState Handle(StartReceiving command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var message = RadioMessage.Parse(command.Message ?? string.Empty);
        return store.Begin(OperatorProcedure.StartReceiving(contexts.ForAppliedKey(), message));
    }
}

public sealed class ChooseGroupsHandler(IMachineSessionStore store)
{
    public MachineState Handle(ChooseGroups command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var schluessel = Input.Kenngruppe(command.Schluesselkenngruppe);
        var verfahren = Input.Kenngruppe(command.Verfahrenkenngruppe);
        var fillers = command.Fillers is { Length: 2 } value
            ? (Input.Letter(value[..1]), Input.Letter(value[1..]))
            : throw new DomainException($"'{command.Fillers}' is not two filler letters.");
        return store.Operate(p => p.ChooseGroups(schluessel, verfahren, fillers.Item1, fillers.Item2));
    }
}

public sealed class FinishMessageHandler(IMachineSessionStore store)
{
    public MachineState Handle(FinishMessage command) => store.Operate(p => p.Finish());
}

public sealed class CancelOperatorHandler(IMachineSessionStore store)
{
    public MachineState Handle(CancelOperator command) => store.Begin(null);
}

internal static class OperatorSessionStoreExtensions
{
    /// <summary>Makes <paramref name="procedure"/> the running procedure and lets it look at the machine.</summary>
    public static MachineState Begin(this IMachineSessionStore store, OperatorProcedure? procedure) =>
        store.Use(machine =>
        {
            store.Procedure = procedure;
            procedure?.Observe(machine);
            return MachineState.From(machine, store.AppliedKey, procedure);
        });

    /// <summary>Applies <paramref name="action"/> to the running procedure.</summary>
    public static MachineState Operate(this IMachineSessionStore store, Action<OperatorProcedure> action) =>
        store.Use(machine =>
        {
            var procedure = store.Procedure ?? throw new DomainException("No operator procedure is running.");
            action(procedure);
            procedure.Observe(machine);
            return MachineState.From(machine, store.AppliedKey, procedure);
        });
}
