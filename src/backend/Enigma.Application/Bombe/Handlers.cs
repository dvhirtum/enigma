using Enigma.Application.Machine;
using Enigma.Application.Procedure;
using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Application.Bombe;

public sealed class GetBombeStateHandler(IBombeSessionStore store)
{
    public BombeState Handle(GetBombeState query) => store.Use(job => BombeState.From(job, store.Run));
}

public sealed class SetCipherTextHandler(IBombeSessionStore store)
{
    public BombeState Handle(SetCipherText command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var source = string.IsNullOrWhiteSpace(command.Text) ? null : MessageSource.Pasted(command.Text);
        return store.Update(job => job.Load(source));
    }
}

public static class ListInterceptsHandler
{
    public static IReadOnlyList<InterceptState> Handle(ListIntercepts query) => [.. Intercepts.All.Select(InterceptState.From)];
}

public sealed class LoadInterceptHandler(IBombeSessionStore store)
{
    public BombeState Handle(LoadIntercept command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var intercept = Intercepts.Find(command.Id ?? string.Empty)
            ?? throw new NotFoundException($"No intercept has id '{command.Id}'.");
        return store.Update(job => job.Load(intercept.Source));
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

        var sheet = sheets[random.Next(sheets.Count)];
        var day = sheet.DailyKeys[random.Next(sheet.DailyKeys.Count)].Day;
        var source = ExerciseGenerator.Generate(
            sheet, day, linker.Book(sheet.KenngruppenbuchId!), linker.Tables(sheet.TauschtafelSetId!), random);
        return store.Update(job => job.Load(source));
    }
}

public sealed class GetSourceCribHandler(IBombeSessionStore store)
{
    public CribState Handle(GetSourceCrib query) =>
        new(store.Use(job => Loaded(job).Crib)?.ToString() ?? throw new NotFoundException("This message has no known crib."));

    internal static MessageSource Loaded(BombeJob job) => job.Source ?? throw new NotFoundException("No message is loaded.");
}

public sealed class GetSolutionHandler(IBombeSessionStore store)
{
    public SolutionState Handle(GetSolution query) =>
        SolutionState.From(store.Use(job => GetSourceCribHandler.Loaded(job).Solution)
            ?? throw new NotFoundException("This message has no known solution."));
}

public sealed class SetCribHandler(IBombeSessionStore store)
{
    public BombeState Handle(SetCrib command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var crib = string.IsNullOrWhiteSpace(command.Crib) ? null : Crib.Parse(command.Crib.Trim());
        return store.Update(job => job.SetCrib(crib));
    }
}

public sealed class PlaceCribHandler(IBombeSessionStore store)
{
    public BombeState Handle(PlaceCrib command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.Update(job => job.Place(command.Position));
    }
}

public sealed class SetMenuHandler(IBombeSessionStore store)
{
    public BombeState Handle(SetMenu command)
    {
        ArgumentNullException.ThrowIfNull(command);

        IReadOnlyList<MenuLink> links = [.. (command.Links ?? []).Select(link => MenuLink.Parse(link ?? string.Empty))];
        Letter? testRegister = command.TestRegister is null ? null : Input.Letter(command.TestRegister);
        return store.Update(job => job.SetMenu(links, testRegister));
    }
}

public sealed class BuildMenuHandler(IBombeSessionStore store)
{
    public BombeState Handle(BuildMenu command) => store.Update(job => job.BuildMenu());
}

public sealed class ConfigureBombeHandler(IBombeSessionStore store)
{
    public BombeState Handle(ConfigureBombe command)
    {
        ArgumentNullException.ThrowIfNull(command);

        Letter? input = string.IsNullOrEmpty(command.Input) ? null : Input.Letter(command.Input);
        var reflector = command.Reflector is null ? null : Input.Reflector(command.Reflector);
        IReadOnlyList<WheelOrder>? wheelOrders = command.WheelOrders?.Select(o => WheelOrder.Parse(o ?? string.Empty)).ToList();
        return store.Update(job => job.Configure(
            command.Input is null ? job.ChosenInput : input,
            command.DiagonalBoard ?? job.DiagonalBoard,
            reflector ?? job.Reflector,
            wheelOrders ?? job.WheelOrders));
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
            var run = BombeRun.Start(job, command.Speed, time);
            store.Run = run;
            return RunState.From(run);
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
            return RunState.From(run);
        });
    }
}

public sealed class ContinueRunHandler(IBombeSessionStore store)
{
    public RunState Handle(ContinueRun command)
    {
        var run = store.Use(_ => store.Run) ?? throw new NotFoundException("There is no run.");
        run.Continue();
        return RunState.From(run);
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
        return RunState.From(run);
    }
}

public sealed class GetRunHandler(IBombeSessionStore store)
{
    public RunState Handle(GetRun query) =>
        RunState.From(store.Use(_ => store.Run) ?? throw new NotFoundException("There is no run."));
}

public sealed class GetStopsHandler(IBombeSessionStore store)
{
    public IReadOnlyList<StopState> Handle(GetStops query)
    {
        ArgumentNullException.ThrowIfNull(query);

        var run = store.Use(_ => store.Run) ?? throw new NotFoundException("There is no run.");
        return [.. run.Stops(query.From).Select(StopState.From)];
    }
}

internal static class BombeSessionStoreExtensions
{
    /// <summary>Changes the job, which is refused while the Bombe runs, and clears the stops of a finished run.</summary>
    public static BombeState Update(this IBombeSessionStore store, Action<BombeJob> action) =>
        store.Use(job =>
        {
            store.EnsureNotRunning("Cancel the run before changing the job.");
            action(job);
            store.Run = null;
            return BombeState.From(job, null);
        });

    public static void EnsureNotRunning(this IBombeSessionStore store, string message)
    {
        if (store.Run is { IsActive: true })
        {
            throw new DomainException(message);
        }
    }
}
