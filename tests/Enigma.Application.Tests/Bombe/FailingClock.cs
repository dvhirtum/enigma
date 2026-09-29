namespace Enigma.Application.Tests.Bombe;

/// <summary>A clock whose timers cannot be created, so a paced run fails at its first pause.</summary>
internal sealed class FailingClock : TimeProvider
{
    public const string Message = "The clock has stopped.";

    public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period) =>
        throw new InvalidOperationException(Message);
}
