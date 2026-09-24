namespace Enigma.Application.KeySheets;

/// <summary>Creates a user-defined sheet. <see cref="Text"/> holds one row per day (see <see cref="KeySheetText"/>).</summary>
public sealed record CreateKeySheet(string Network, string Month, string Text);

/// <summary>Replaces the network, month and daily keys of a generated or user-defined sheet.</summary>
public sealed record UpdateKeySheet(string Id, string Network, string Month, string Text);

public sealed record DeleteKeySheet(string Id);

/// <summary>Generates a sheet for <see cref="Model"/> (M3 or M4) covering every day of <see cref="Month"/>.</summary>
public sealed record GenerateKeySheet(string Model, string Network, string Month);

/// <summary>
/// Stores a sheet read from a key sheet file as user-defined, with the Kenngruppenbuch and Tauschtafel set in the file.
/// </summary>
public sealed record ImportKeySheet(KeySheetDocument Document);

/// <summary>The sheet as a key sheet file, with its Kenngruppenbuch and Tauschtafel set.</summary>
public sealed record ExportKeySheet(string Id);

/// <summary>Replaces the machine with one set up with the key for <see cref="Day"/>. All rotors show A.</summary>
public sealed record ApplyDailyKey(string SheetId, int Day);

public sealed record ListKeySheets;

public sealed record GetKeySheet(string Id);
