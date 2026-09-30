using Enigma.Application.Procedure;
using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Application.Bombe;

public sealed class GetCheckHandler(IBombeSessionStore store)
{
    public CheckState Handle(GetCheck query)
    {
        ArgumentNullException.ThrowIfNull(query);

        return store.UseCheck(query.Stop, (run, check) => CheckState.From(check, query.Stop, run));
    }
}

public sealed class SetCheckHandler(IBombeSessionStore store)
{
    public CheckState Handle(SetCheck command)
    {
        ArgumentNullException.ThrowIfNull(command);

        return store.UseCheck(command.Stop, (run, check) =>
        {
            var position = command.Position is { } letters ? DrumPosition.Parse(letters.ToUpperInvariant()) : check.MachinePosition;
            var steckers = command.Steckers is { } pairs ? Steckers.Parse(pairs.ToUpperInvariant()) : check.Steckers;
            var ring = command.RightRing is { } number ? RingSetting.FromNumber(number) : check.RightRing;
            (check.MachinePosition, check.Steckers, check.RightRing) = (position, steckers, ring);
            return CheckState.From(check, command.Stop, run);
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
        return store.UseCheck(command.Stop, (run, check) =>
            ConfirmationState.From(check.Confirm(verdict, run.Solution), CheckState.From(check, command.Stop, run)));
    }
}

internal static class CheckStoreExtensions
{
    public static T UseCheck<T>(this IBombeSessionStore store, int stop, Func<BombeRun, StopCheck, T> action) =>
        store.Use(_ =>
        {
            var run = store.Run ?? throw new NotFoundException("There is no run.");
            return action(run, run.Check(stop));
        });
}
