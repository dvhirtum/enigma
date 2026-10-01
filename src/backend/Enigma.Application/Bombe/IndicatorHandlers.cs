using Enigma.Application.Machine;
using Enigma.Application.Procedure;
using Enigma.Domain.Bombe;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Bombe;

public sealed class TakePinchHandler(IBombeSessionStore store, KeySheetLinker linker, Random random)
{
    public BombeState Handle(TakePinch command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var source = store.Use(GetSourceCribHandler.Loaded);
        var (sheetId, day) = source switch
        {
            { Kind: SourceKind.Intercept } => throw new DomainException("The key sheet day of an intercept is not known, so its indicator cannot be read."),
            { Message: null } => throw new DomainException("Bare cipher text has no indicator to read."),
            { Kind: SourceKind.Exercise, Solution.Exercise: { } exercise } => (exercise.SheetId, exercise.Day),
            _ when command is { SheetId: { Length: > 0 } id, Day: { } chosen } => (id, chosen),
            _ => throw new DomainException("Choose the key sheet day the message was sent on."),
        };

        var sheet = linker.List().FirstOrDefault(sheet => sheet.Id == sheetId)
            ?? throw new NotFoundException($"No key sheet has id '{sheetId}'.");
        var tables = linker.Tables(sheet.TauschtafelSetId!);
        var others = ExerciseGenerator.DayTraffic(sheet, day, linker.Book(sheet.KenngruppenbuchId!), tables, random);
        var pinch = new Pinch(sheet.Id, sheet.Network, sheet.Month, day, sheet.KeyFor(day).Grundstellung!, tables.TableFor(sheet.Month, day));
        return store.Use(job =>
        {
            if (job.Source != source)
            {
                throw new DomainException("The message changed meanwhile. Take the pinch again.");
            }

            job.TakePinch(pinch, others);
            return BombeState.From(job, store.Run, store);
        });
    }
}

public sealed class WriteIndicatorHandler(IBombeSessionStore store)
{
    public BombeState Handle(WriteIndicator command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.UseTraffic((job, traffic) =>
        {
            var message = traffic.Messages.ElementAtOrDefault(command.Message);
            traffic.Write(
                command.Message,
                Group(command.Schluesselkenngruppe, message?.Schluesselkenngruppe),
                Group(command.Verfahrenkenngruppe, message?.Verfahrenkenngruppe));
            return BombeState.From(job, store.Run, store);
        });
    }

    private static Kenngruppe? Group(string? written, Kenngruppe? kept) =>
        written switch
        {
            null => kept,
            "" => null,
            _ => Input.Kenngruppe(written),
        };
}

public sealed class FillInIndicatorHandler(IBombeSessionStore store)
{
    public BombeState Handle(FillInIndicator command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.UseTraffic((job, traffic) =>
        {
            traffic.FillIn(command.Message);
            return BombeState.From(job, store.Run, store);
        });
    }
}

public sealed class GetRingTableHandler(IBombeSessionStore store)
{
    public RingTableState Handle(GetRingTable query)
    {
        ArgumentNullException.ThrowIfNull(query);

        return store.UseTraffic((_, traffic) =>
        {
            var verfahrenkenngruppe = traffic.WrittenVerfahrenkenngruppe(0);
            var check = store.Stops.Check(query.Stop);
            var grundstellung = traffic.Pinch.Grundstellung;
            return new RingTableState(
                grundstellung.ToString(),
                verfahrenkenngruppe.ToString(),
                check.RightRing.Number,
                check.Stop.Position.ToString(),
                [.. check.RingTable(grundstellung, verfahrenkenngruppe).Select(row =>
                    new RingRowState(row.Left.Number, row.Middle.Number, row.Spruchschluessel.ToString(), row.Cores.ToString()))]);
        });
    }
}

public sealed class ReadRingsHandler(IBombeSessionStore store)
{
    public CheckState Handle(ReadRings command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.UseTraffic((_, traffic) =>
        {
            var check = store.Stops.Check(command.Stop);
            check.Reading = command switch
            {
                { Left: null, Middle: null } => null,
                { Left: { } left, Middle: { } middle } => new IndicatorReading(
                    traffic.Pinch.Grundstellung, traffic.WrittenVerfahrenkenngruppe(0), RingSetting.FromNumber(left), RingSetting.FromNumber(middle)),
                _ => throw new DomainException("Give both the left and the middle ring."),
            };
            return CheckState.From(check, command.Stop, store.Stops.SolutionOf(command.Stop));
        });
    }
}

internal static class TrafficStoreExtensions
{
    public static T UseTraffic<T>(this IBombeSessionStore store, Func<BombeJob, DayTraffic, T> action) =>
        store.Use(job => action(job, job.Traffic ?? throw new DomainException("Take a pinch of the key sheet day first.")));
}
