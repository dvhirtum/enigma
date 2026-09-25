namespace Enigma.Application.KeySheets;

public sealed record DeleteKeySheet(string Id);

/// <summary>
/// Generates sheets for <see cref="Model"/> (M3 or M4) covering every month of <see cref="Year"/>, one per network of
/// the Kenngruppenbuch.
/// </summary>
public sealed record GenerateKeySheets(string Model, int Year);

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
