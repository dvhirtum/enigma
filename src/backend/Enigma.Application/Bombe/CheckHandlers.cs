using Enigma.Application.Procedure;
using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Application.Bombe;

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
            var windows = command.MachineWindows is { } window ? DrumPosition.Parse(window.ToUpperInvariant()) : check.MachineWindows;
            var rings = command.MachineRings is { } setting ? DrumPosition.Parse(setting.ToUpperInvariant()) : check.MachineRings;
            var steckers = command.Steckers is { } pairs ? Steckers.Parse(pairs.ToUpperInvariant()) : check.Steckers;
            var ring = command.RightRing is { } number ? RingSetting.FromNumber(number) : check.RightRing;
            (check.MachineWindows, check.MachineRings, check.Steckers, check.RightRing) = (windows, rings, steckers, ring);
            return CheckState.From(check, command.Stop);
        });
    }
}

public sealed class PressCheckKeyHandler(IBombeSessionStore store)
{
    public LampState Handle(PressCheckKey command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.UseCheck(command.Stop, (_, check) =>
            new LampState(check.Press(ParseKey(command.Key)).ToString()));
    }

    private static Letter ParseKey(string? key) =>
        key is { Length: 1 } && char.IsAsciiLetter(key[0])
            ? Letter.FromChar(char.ToUpperInvariant(key[0]))
            : throw new DomainException($"'{key}' is not a key.");
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
