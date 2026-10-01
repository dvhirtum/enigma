namespace Enigma.Application.Bombe;

/// <summary>Loads pasted text: a Navy radio message, or bare cipher text (spaces and line breaks ignored). Empty clears it.</summary>
public sealed record SetCipherText(string? Text);

/// <summary>Replaces the crib, or removes it when empty.</summary>
public sealed record SetCrib(string? Crib);

/// <summary>Places the crib under the cipher text (0 = the first letter) and builds the menu.</summary>
public sealed record PlaceCrib(int Position);

/// <summary>Draws the menu from links of the placement, such as "SW1". Without a test register letter it is chosen.</summary>
public sealed record SetMenu(IReadOnlyList<string>? Links, string? TestRegister);

public sealed record BuildMenu;

/// <summary>Plugs up the Bombe with the menu.</summary>
public sealed record PlugUpMenu;

/// <summary>The run settings; each one left out (null) stays as it is.</summary>
public sealed record ConfigureBombe(bool? DiagonalBoard, string? Reflector);

/// <summary>Cables a jack (0 or 1) of a scrambler (0 = the first of the chain) to a letter's common; empty unplugs it.</summary>
public sealed record PlugJack(int Chain, int Scrambler, int Jack, string? Letter);

/// <summary>Fits drums of a rotor, such as "II", in a row (0 = upper) of a chain on its scramblers 0 up to <see cref="UpTo"/>.</summary>
public sealed record FitRow(int Chain, int Row, int UpTo, string? Rotor);

/// <summary>Takes one drum (row 0 = upper) of a scrambler back to the rack.</summary>
public sealed record RemoveDrum(int Chain, int Scrambler, int Row);

/// <summary>Sets the start letters, such as "ZZB", of a scrambler of a chain.</summary>
public sealed record TurnScrambler(int Chain, int Scrambler, string? Start);

/// <summary>
/// Plugs a chain's test register onto a letter's common and sets its input wire; each left out (null) stays as it is.
/// An empty letter unplugs it, an empty input uses the default.
/// </summary>
public sealed record SetTestRegister(int Chain, string? Letter, string? Input);

/// <summary>Joins chain <see cref="Join"/> + 1 to the next one, or parts them.</summary>
public sealed record JoinChains(int Join, bool Joined);

/// <summary>Clears the stops logged for the notebook and their checks.</summary>
public sealed record ClearStops;

/// <summary>Clears the printout.</summary>
public sealed record ClearPrintout;

/// <summary>
/// Starts a run at <see cref="Speed"/> positions per second, or at full speed when null. With <see cref="Notebook"/>
/// (the Hut 8 notebook is open) the stops are logged for checking too.
/// </summary>
public sealed record StartRun(double? Speed, bool Notebook);

/// <summary>Sets the speed of the run in positions per second, or full speed when null.</summary>
public sealed record SetRunSpeed(double? Speed);

/// <summary>Continues a run paused at a stop.</summary>
public sealed record ContinueRun;

public sealed record CancelRun;

public sealed record GetBombeState;

public sealed record GetRun;

/// <summary>The stops logged from the <see cref="From"/>th on, at most <see cref="Count"/> of them (null: all).</summary>
public sealed record GetStops(int From, int? Count = null);

/// <summary>The printed stops from the <see cref="From"/>th on, at most <see cref="Count"/> of them (null: all).</summary>
public sealed record GetPrintout(int From, int? Count = null);

public sealed record ListIntercepts;

/// <summary>Loads a bundled historical intercept.</summary>
public sealed record LoadIntercept(string? Id);

/// <summary>Loads a new exercise, sent on a random day of a random M3 key sheet.</summary>
public sealed record GenerateExercise;

/// <summary>The likely crib of the loaded intercept or exercise.</summary>
public sealed record GetSourceCrib;

/// <summary>The key and plain text of the loaded intercept or exercise.</summary>
public sealed record GetSolution;

/// <summary>
/// Sets up the checking machine; each field left out (null) stays as it is. The reflector is a cartridge such as "B" or
/// "C-thin" (empty: none); the dummy says whether the dummy drum is fitted. The drums are rotors left to right, such
/// as ["II", null, "III"] (null or empty: no drum); rings and windows are letters such as "SNY" and "ZZE".
/// </summary>
public sealed record SetCheckingMachine(string? Reflector, IReadOnlyList<string?>? Drums, string? Rings, string? Windows, bool? Dummy = null);

/// <summary>Presses a key on the checking machine.</summary>
public sealed record PressCheckingKey(string? Key);

/// <summary>The check of the <see cref="Stop"/>th logged stop (0 = the first).</summary>
public sealed record GetCheck(int Stop);

/// <summary>
/// Changes a check; each field left out (null) stays as it is. Steckers are pairs such as "AD ET RR" (empty clears
/// them); the right ring is 1–26.
/// </summary>
public sealed record SetCheck(int Stop, string? Steckers, int? RightRing);

/// <summary>Sets the checking machine up for a stop: its reflector and drums, the rings at its indicator, the windows at ZZZ.</summary>
public sealed record SetUpCheckingMachine(int Stop);

/// <summary>Gives the verdict on a stop: True, False or Unchecked.</summary>
public sealed record ConfirmCheck(int Stop, string? Verdict);

/// <summary>Proposes steckers for the letters of a stop's check that are still unknown, without changing the check.</summary>
public sealed record SuggestSteckers(int Stop);

/// <summary>Scores the 26 right rings of a stop's check and sets the lowest with the best score.</summary>
public sealed record FindRightRing(int Stop);
