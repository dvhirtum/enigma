using System.Globalization;
using Enigma.Application.KeySheets;
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
        var sheet = linker.Load(applied.SheetId);
        var grundstellung = applied.Key.Grundstellung
            ?? sheet.KeyFor(applied.Key.Day).Grundstellung
            ?? throw new DomainException($"Day {applied.Key.Day} of {applied.Network} {applied.Month} has no Grundstellung.");
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

/// <summary>A key sheet day that fits a received message.</summary>
public sealed record ReceivingKey(string SheetId, string Network, string Month, int Day, string Model, string Schluesselkenngruppe);

public sealed class FindReceivingKeysHandler(KeySheetLinker linker)
{
    /// <summary>Decrypts the indicator with each sheet's table for the date and keeps the sheets it is allotted to.</summary>
    public IReadOnlyList<ReceivingKey> Handle(FindReceivingKeys query)
    {
        ArgumentNullException.ThrowIfNull(query);

        var message = RadioMessage.Parse(query.Message ?? string.Empty);
        var date = DateOnly.TryParseExact(query.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)
            ? parsed
            : throw new DomainException($"'{query.Date}' is not a date such as 1944-06-19.");
        var month = new KeyMonth(date.Year, date.Month);

        return
        [
            .. linker.List()
                .Where(s => s.Month == month && s.DailyKeys.Any(k => k.Day == date.Day))
                .Select(s => linker.Load(s.Id))
                .Select(s => (Sheet: s, Indicator: Indicator.Decrypt(message.Indicator, linker.Tables(s.TauschtafelSetId!).TableFor(month, date.Day))))
                .Where(x => linker.Book(x.Sheet.KenngruppenbuchId!).IsSchluesselkenngruppe(x.Sheet.Network, x.Indicator.Schluesselkenngruppe))
                .OrderBy(x => x.Sheet.Network, StringComparer.OrdinalIgnoreCase)
                .Select(x => new ReceivingKey(
                    x.Sheet.Id, x.Sheet.Network, month.ToString(), date.Day, x.Sheet.Model.Name, x.Indicator.Schluesselkenngruppe.ToString())),
        ];
    }
}

public sealed class StartReceivingHandler(IMachineSessionStore store, ApplyDailyKeyHandler apply, OperatorContexts contexts)
{
    public MachineState Handle(StartReceiving command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var message = RadioMessage.Parse(command.Message ?? string.Empty);
        if (command.SheetId is not null)
        {
            var day = command.Day ?? throw new DomainException("Receiving with a key sheet needs a day.");
            apply.Handle(new ApplyDailyKey(command.SheetId, day));
        }

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
