using Enigma.Application.Machine;
using Enigma.Application.Procedure;
using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Application.Bombe;

public sealed class SetCheckingMachineHandler(IBombeSessionStore store)
{
    public BombeState Handle(SetCheckingMachine command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var reflector = command.Reflector is null ? null : Input.Reflector(command.Reflector);
        IReadOnlyList<RotorType?>? drums = command.Drums is null
            ? null
            : [.. command.Drums.Select(rotor => string.IsNullOrEmpty(rotor) ? null : Input.Rotor(rotor))];
        var rings = command.Rings is { } ring ? DrumPosition.Parse(ring.ToUpperInvariant()) : (DrumPosition?)null;
        var windows = command.Windows is { } window ? DrumPosition.Parse(window.ToUpperInvariant()) : (DrumPosition?)null;
        return store.Use(job =>
        {
            var checker = job.Checker;
            if (reflector is not null)
            {
                checker.SetReflector(reflector);
            }

            if (drums is not null)
            {
                checker.Fit(drums);
            }

            (checker.Rings, checker.Windows) = (rings ?? checker.Rings, windows ?? checker.Windows);
            return BombeState.From(job, store.Run, store);
        });
    }
}

public sealed class PressCheckingKeyHandler(IBombeSessionStore store)
{
    public LampState Handle(PressCheckingKey command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var key = command.Key is { Length: 1 } && char.IsAsciiLetter(command.Key[0])
            ? Letter.FromChar(char.ToUpperInvariant(command.Key[0]))
            : throw new DomainException($"'{command.Key}' is not a key.");
        return store.Use(job =>
        {
            var checker = job.Checker;
            var lamp = checker.Press(key);
            if (checker is not { Stop: { } stop, CorePositions: { } core } || stop >= store.Stops.Count)
            {
                return new LampState(lamp.ToString(), null);
            }

            var check = store.Stops.Check(stop);
            check.Record(core, key, lamp);
            return new LampState(lamp.ToString(), CheckState.From(check, stop));
        });
    }
}

public sealed class SetUpCheckingMachineHandler(IBombeSessionStore store)
{
    public BombeState Handle(SetUpCheckingMachine command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.Use(job =>
        {
            var check = store.Stops.Check(command.Stop);
            job.Checker.SetUp(command.Stop, check.Stop, check.Reflector);
            return BombeState.From(job, store.Run, store);
        });
    }
}

public sealed class GetCheckHandler(IBombeSessionStore store)
{
    public CheckState Handle(GetCheck query)
    {
        ArgumentNullException.ThrowIfNull(query);

        return store.UseCheck(query.Stop, (_, check) => CheckState.From(check, query.Stop));
    }
}

public sealed class SetCheckHandler(IBombeSessionStore store)
{
    public CheckState Handle(SetCheck command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.UseCheck(command.Stop, (_, check) =>
        {
            var sheet = command.Steckers is { } pairs ? SteckerSheet.Parse(pairs.ToUpperInvariant()) : check.Sheet;
            var ring = command.RightRing is { } number ? RingSetting.FromNumber(number) : check.RightRing;
            (check.Sheet, check.RightRing) = (sheet, ring);
            return CheckState.From(check, command.Stop);
        });
    }
}

public sealed class ConfirmCheckHandler(IBombeSessionStore store)
{
    public ConfirmationState Handle(ConfirmCheck command)
    {
        ArgumentNullException.ThrowIfNull(command);

        var verdict = Enum.TryParse<StopVerdict>(command.Verdict, ignoreCase: true, out var parsed) && Enum.IsDefined(parsed)
            ? parsed
            : throw new DomainException($"'{command.Verdict}' is not a verdict: True, False or Unchecked.");
        return store.UseCheck(command.Stop, (log, check) =>
            ConfirmationState.From(check.Confirm(verdict, log.SolutionOf(command.Stop)), CheckState.From(check, command.Stop)));
    }
}

public sealed class SuggestSteckersHandler(IBombeSessionStore store)
{
    public SuggestionState Handle(SuggestSteckers command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.UseCheck(command.Stop, (_, check) => SuggestionState.From(check.Suggest()));
    }
}

public sealed class FindRightRingHandler(IBombeSessionStore store)
{
    public FindState Handle(FindRightRing command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.UseCheck(command.Stop, (_, check) =>
        {
            RingScoreState[] rings = [.. check.FindRightRing().Select(ring => new RingScoreState(ring.Ring.Number, ring.Score, ring.Best))];
            return new FindState(rings, CheckState.From(check, command.Stop));
        });
    }
}

internal static class CheckStoreExtensions
{
    public static T UseCheck<T>(this IBombeSessionStore store, int stop, Func<StopLog, StopCheck, T> action) =>
        store.Use(_ => action(store.Stops, store.Stops.Check(stop)));
}
