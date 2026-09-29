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

        var letters = Letters(command.Text);
        return store.Update(job => job.SetCipherText(letters));
    }

    private static IReadOnlyList<Letter> Letters(string? text) =>
        [.. (text ?? string.Empty).Where(c => !char.IsWhiteSpace(c)).Select(Letter.FromChar)];
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

        Letter? input = command.Input is null ? null : Input.Letter(command.Input);
        var reflector = Input.Reflector(command.Reflector);
        IReadOnlyList<WheelOrder> wheelOrders = [.. (command.WheelOrders ?? []).Select(o => WheelOrder.Parse(o ?? string.Empty))];
        return store.Update(job => job.Configure(input, command.DiagonalBoard, reflector, wheelOrders));
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
            var run = store.Run is { Status: RunStatus.Running } running
                ? running
                : throw new DomainException("The Bombe is not running.");
            run.Speed = command.Speed;
            return RunState.From(run);
        });
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
        if (store.Run is { Status: RunStatus.Running })
        {
            throw new DomainException(message);
        }
    }
}
