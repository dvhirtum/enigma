namespace Enigma.Application.OperatorMode;

/// <summary>Starts sending: draws the filler letters and notes the time of origin.</summary>
public sealed record StartSending;

/// <summary>
/// Finds the key sheets and days that fit <see cref="Message"/> on <see cref="Date"/> (yyyy-MM-dd): those whose
/// network the decrypted Schlüsselkenngruppe is allotted to.
/// </summary>
public sealed record FindReceivingKeys(string Message, string Date);

/// <summary>
/// Applies the key for <see cref="Day"/> of sheet <see cref="SheetId"/> and starts receiving <see cref="Message"/>, a
/// radio message with or without its preamble.
/// </summary>
public sealed record StartReceiving(string Message, string SheetId, int Day);

/// <summary>Chooses the groups of the indicator to send. <see cref="Fillers"/> is the filler before and after, such as "QX".</summary>
public sealed record ChooseGroups(string Schluesselkenngruppe, string Verfahrenkenngruppe, string Fillers);

/// <summary>Ends typing a message to send and builds the radio message.</summary>
public sealed record FinishMessage;

public sealed record CancelOperator;
