using Enigma.Domain.KeyProcedure;

namespace Enigma.Application.Machine;

/// <summary>The daily key the machine was last set up with, as it was when applied.</summary>
public sealed record AppliedKey(string SheetId, string Network, string Month, DailyKey Key);
