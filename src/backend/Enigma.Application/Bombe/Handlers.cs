using Enigma.Application.Machine;
using Enigma.Application.Procedure;
using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Application.Bombe;

public sealed class GetBombeStateHandler(IBombeSessionStore store)
{
    public BombeState Handle(GetBombeState query) => store.Use(job => BombeState.From(job, store.Run, store));
}

public sealed class SetCipherTextHandler(IBombeSessionStore store)
{
    public BombeState Handle(SetCipherText command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var source = string.IsNullOrWhiteSpace(command.Text) ? null : MessageSource.Pasted(command.Text);
        return store.Update(job => job.Load(source), clearStops: true);
    }
}

public static class ListInterceptsHandler
{
    public static IReadOnlyList<InterceptState> Handle(ListIntercepts query) => [.. Intercepts.All.Select(InterceptState.From)];
}

public static class ListMessageTypesHandler
{
    public static IReadOnlyList<MessageTypeState> Handle(ListMessageTypes query) =>
        [.. MessageType.All.Select(type => new MessageTypeState(type.Id, type.Name))];
}

public sealed class LoadInterceptHandler(IBombeSessionStore store)
{
    public BombeState Handle(LoadIntercept command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var intercept = Intercepts.Find(command.Id ?? string.Empty)
            ?? throw new NotFoundException($"No intercept has id '{command.Id}'.");
        return store.Update(job => job.Load(intercept.Source), clearStops: true);
    }
}

public sealed class GenerateExerciseHandler(IBombeSessionStore store, KeySheetLinker linker, Random random)
{
    public BombeState Handle(GenerateExercise command)
    {
        var sheets = linker.List().Where(sheet => sheet.Model == MachineModel.M3).ToList();
        if (sheets.Count == 0)
        {
            throw new DomainException("Generate or import M3 key sheets first.");
        }

        var days = sheets
            .SelectMany(sheet => sheet.DailyKeys.Where(ExerciseGenerator.Suits).Select(key => (Sheet: sheet, key.Day)))
            .ToList();
        if (days.Count == 0)
        {
            throw new DomainException("Every day of the M3 key sheets has rotor VI, VII or VIII on the right. Generate more M3 key sheets.");
        }

        var (sheet, day) = days[random.Next(days.Count)];
        var source = ExerciseGenerator.Generate(
            sheet, day, linker.Book(sheet.KenngruppenbuchId!), linker.Tables(sheet.TauschtafelSetId!), random);
        return store.Update(job => job.Load(source), clearStops: true);
    }
}

public sealed class GetSourceCribHandler(IBombeSessionStore store)
{
    public CribState Handle(GetSourceCrib query)
    {
        ArgumentNullException.ThrowIfNull(query);

        var type = string.IsNullOrEmpty(query.Type)
            ? null
            : MessageType.Find(query.Type) ?? throw new NotFoundException($"No message type has id '{query.Type}'.");
        var (crib, place) = store.Use(job => Loaded(job).SuggestCrib(type))
            ?? throw new NotFoundException("This message has no known crib. Choose its message type.");
        return new CribState(crib.ToString(), place);
    }

    internal static MessageSource Loaded(BombeJob job) => job.Source ?? throw new NotFoundException("No message is loaded.");
}

public sealed class GetSolutionHandler(IBombeSessionStore store)
{
    public SolutionState Handle(GetSolution query) =>
        SolutionState.From(store.Use(job => GetSourceCribHandler.Loaded(job).Solution)
            ?? throw new NotFoundException("This message has no known solution."));
}

public sealed class ShowWheelOrdersHandler(IBombeSessionStore store)
{
    public BombeState Handle(ShowWheelOrders command) =>
        store.Update(job =>
        {
            if (GetSourceCribHandler.Loaded(job).WheelOrders is null)
            {
                throw new NotFoundException("This message has no known wheel order.");
            }

            job.ShowWheelOrders();
        });
}

public sealed class SetCribHandler(IBombeSessionStore store)
{
    public BombeState Handle(SetCrib command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var crib = string.IsNullOrWhiteSpace(command.Crib) ? null : Crib.Parse(command.Crib.Trim());
        return store.Update(job => job.SetCrib(crib), clearStops: true);
    }
}

public sealed class PlaceCribHandler(IBombeSessionStore store)
{
    public BombeState Handle(PlaceCrib command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.Update(job => job.Place(command.Position), clearStops: true);
    }
}

public sealed class SetMenuHandler(IBombeSessionStore store)
{
    public BombeState Handle(SetMenu command)
    {
        ArgumentNullException.ThrowIfNull(command);

        IReadOnlyList<MenuLink> links = [.. (command.Links ?? []).Select(link => MenuLink.Parse(link ?? string.Empty))];
        Letter? testRegister = command.TestRegister is null ? null : Input.Letter(command.TestRegister);
        return store.Update(job => job.SetMenu(links, testRegister), clearStops: true);
    }
}

public sealed class BuildMenuHandler(IBombeSessionStore store)
{
    public BombeState Handle(BuildMenu command) => store.Update(job => job.BuildMenu(), clearStops: true);
}

public sealed class PlugUpMenuHandler(IBombeSessionStore store)
{
    public BombeState Handle(PlugUpMenu command) => store.Update(job => job.PlugUpMenu());
}

public sealed class ConfigureBombeHandler(IBombeSessionStore store)
{
    public BombeState Handle(ConfigureBombe command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var reflector = command.Reflector is null ? null : Input.Reflector(command.Reflector);
        return store.Update(job => job.Configure(command.DiagonalBoard ?? job.DiagonalBoard, reflector ?? job.Reflector));
    }
}

public sealed class PlugJackHandler(IBombeSessionStore store)
{
    public BombeState Handle(PlugJack command)
    {
        ArgumentNullException.ThrowIfNull(command);

        Letter? letter = string.IsNullOrEmpty(command.Letter) ? null : Input.Letter(command.Letter);
        return store.Update(job => job.Machine.Plug(command.Chain, command.Scrambler, command.Jack, letter));
    }
}

public sealed class FitRowHandler(IBombeSessionStore store)
{
    public BombeState Handle(FitRow command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var rotor = Input.Rotor(command.Rotor ?? string.Empty);
        return store.Update(job => job.Machine.FitRow(command.Chain, command.Row, command.UpTo, rotor));
    }
}

public sealed class RemoveDrumHandler(IBombeSessionStore store)
{
    public BombeState Handle(RemoveDrum command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.Update(job => job.Machine.RemoveDrum(command.Chain, command.Scrambler, command.Row));
    }
}

public sealed class TurnScramblerHandler(IBombeSessionStore store)
{
    public BombeState Handle(TurnScrambler command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var start = DrumPosition.Parse((command.Start ?? string.Empty).ToUpperInvariant());
        return store.Update(job => job.Machine.Turn(command.Chain, command.Scrambler, start));
    }
}

public sealed class SetTestRegisterHandler(IBombeSessionStore store)
{
    public BombeState Handle(SetTestRegister command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.Update(job =>
        {
            if (command.Letter is { } letter)
            {
                job.Machine.PlugTestRegister(command.Chain, letter.Length == 0 ? null : Input.Letter(letter));
            }

            if (command.Input is { } input)
            {
                job.Machine.SetInput(command.Chain, input.Length == 0 ? null : Input.Letter(input));
            }
        });
    }
}

public sealed class JoinChainsHandler(IBombeSessionStore store)
{
    public BombeState Handle(JoinChains command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.Update(job => job.Machine.Join(command.Join, command.Joined));
    }
}

public sealed class StartRunHandler(IBombeSessionStore store, TimeProvider time)
{
    public RunState Handle(StartRun command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.Use(job =>
        {
            store.EnsureNotRunning("The Bombe is already running.");
            var run = BombeRun.Start(job, command.Speed, time, store.Printout, command.Notebook ? store.Stops : null);
            store.Run = run;
            return RunState.From(run, store);
        });
    }
}

public sealed class SetRunSpeedHandler(IBombeSessionStore store)
{
    public RunState Handle(SetRunSpeed command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.Use(_ =>
        {
            var run = store.Run is { IsActive: true } running
                ? running
                : throw new DomainException("The Bombe is not running.");
            run.Speed = command.Speed;
            return RunState.From(run, store);
        });
    }
}

public sealed class ContinueRunHandler(IBombeSessionStore store)
{
    public RunState Handle(ContinueRun command)
    {
        var run = store.Use(_ => store.Run) ?? throw new NotFoundException("There is no run.");
        run.Continue();
        return RunState.From(run, store);
    }
}

public sealed class CancelRunHandler(IBombeSessionStore store)
{
    /// <summary>Cancels the run and waits for it to stop.</summary>
    public RunState Handle(CancelRun command)
    {
        var run = store.Use(_ => store.Run) ?? throw new NotFoundException("There is no run.");
        run.Cancel();
        run.Completion.Wait();
        return RunState.From(run, store);
    }
}

public sealed class GetRunHandler(IBombeSessionStore store)
{
    public RunState Handle(GetRun query) =>
        RunState.From(store.Use(_ => store.Run) ?? throw new NotFoundException("There is no run."), store);
}

public sealed class GetStopsHandler(IBombeSessionStore store)
{
    public IReadOnlyList<StopState> Handle(GetStops query)
    {
        ArgumentNullException.ThrowIfNull(query);

        var from = Math.Max(0, query.From);
        var stops = store.Stops.Stops(from, query.Count);
        return [.. stops.Select((stop, i) => StopState.From(stop, from + i, store.Stops.VerdictOn(from + i)))];
    }
}

public sealed class GetPrintoutHandler(IBombeSessionStore store)
{
    public IReadOnlyList<PrintedStopState> Handle(GetPrintout query)
    {
        ArgumentNullException.ThrowIfNull(query);

        var from = Math.Max(0, query.From);
        return [.. store.Printout.Stops(from, query.Count).Select((stop, i) => PrintedStopState.From(stop, from + i))];
    }
}

public sealed class ClearStopsHandler(IBombeSessionStore store)
{
    public BombeState Handle(ClearStops command) =>
        store.Use(job =>
        {
            store.EnsureNotRunning("Cancel the run before clearing the stops.");
            store.ClearStops(job);
            return BombeState.From(job, store.Run, store);
        });
}

public sealed class ClearPrintoutHandler(IBombeSessionStore store)
{
    public BombeState Handle(ClearPrintout command) =>
        store.Use(job =>
        {
            store.EnsureNotRunning("Cancel the run before clearing the printout.");
            store.Printout.Clear();
            return BombeState.From(job, store.Run, store);
        });
}

internal static class BombeSessionStoreExtensions
{
    /// <summary>
    /// Changes the job, which is refused while the Bombe runs, and drops the finished run. A change to the message, crib
    /// or menu also clears the stops logged for the notebook.
    /// </summary>
    public static BombeState Update(this IBombeSessionStore store, Action<BombeJob> action, bool clearStops = false) =>
        store.Use(job =>
        {
            store.EnsureNotRunning("Cancel the run before changing the job.");
            action(job);
            store.Run = null;
            if (clearStops)
            {
                store.ClearStops(job);
            }

            return BombeState.From(job, null, store);
        });

    /// <summary>Clears the stops logged for the notebook, and the checking machine forgets the stop it was set up for.</summary>
    public static void ClearStops(this IBombeSessionStore store, BombeJob job)
    {
        store.Stops.Clear();
        job.Checker.ForgetStop();
    }

    public static void EnsureNotRunning(this IBombeSessionStore store, string message)
    {
        if (store.Run is { IsActive: true })
        {
            throw new DomainException(message);
        }
    }
}
