namespace Enigma.Application.Bombe;

/// <summary>Loads pasted text: a Navy radio message, or bare cipher text (spaces and line breaks ignored). Empty clears it.</summary>
public sealed record SetCipherText(string? Text);

/// <summary>Replaces the crib, or removes it when empty.</summary>
public sealed record SetCrib(string? Crib);

/// <summary>Places the crib under the cipher text (0 = the first letter) and builds the menu.</summary>
public sealed record PlaceCrib(int Position);

/// <summary>Plugs up links of the placement, such as "SW1". Without a test register letter it is chosen.</summary>
public sealed record SetMenu(IReadOnlyList<string>? Links, string? TestRegister);

public sealed record BuildMenu;

/// <summary>
/// The run settings; each one left out (null) stays as it is. An empty input letter uses the default. Wheel orders are
/// written as "II V III".
/// </summary>
public sealed record ConfigureBombe(string? Input, bool? DiagonalBoard, string? Reflector, IReadOnlyList<string>? WheelOrders);

/// <summary>Starts a run at <see cref="Speed"/> positions per second, or at full speed when null.</summary>
public sealed record StartRun(double? Speed);

/// <summary>Sets the speed of the run in positions per second, or full speed when null.</summary>
public sealed record SetRunSpeed(double? Speed);

/// <summary>Continues a run paused at a stop.</summary>
public sealed record ContinueRun;

public sealed record CancelRun;

public sealed record GetBombeState;

public sealed record GetRun;

/// <summary>The stops of the run from the <see cref="From"/>th on.</summary>
public sealed record GetStops(int From);

public sealed record ListIntercepts;

/// <summary>Loads a bundled historical intercept.</summary>
public sealed record LoadIntercept(string? Id);

/// <summary>Loads a new exercise, sent on a random day of a random M3 key sheet.</summary>
public sealed record GenerateExercise;

/// <summary>The likely crib of the loaded intercept or exercise.</summary>
public sealed record GetSourceCrib;

/// <summary>The key and plain text of the loaded intercept or exercise.</summary>
public sealed record GetSolution;

/// <summary>The check of the <see cref="Stop"/>th stop of the run (0 = the first).</summary>
public sealed record GetCheck(int Stop);

/// <summary>
/// Changes a check; each field left out (null) stays as it is. Position is the checking machine's drum letters, such
/// as "WPC"; steckers are pairs such as "AD ET RR" (empty clears them); the right ring is 1–26.
/// </summary>
public sealed record SetCheck(int Stop, string? Position, string? Steckers, int? RightRing);

/// <summary>Presses a key on the checking machine of a stop's check.</summary>
public sealed record PressCheckKey(int Stop, string? Key);

/// <summary>Gives the verdict on a stop: True, False or Unchecked.</summary>
public sealed record ConfirmCheck(int Stop, string? Verdict);

/// <summary>Proposes steckers for the letters of a stop's check that are still unknown, without changing the check.</summary>
public sealed record SuggestSteckers(int Stop);

/// <summary>Scores the 26 right rings of a stop's check and sets the lowest with the best score.</summary>
public sealed record FindRightRing(int Stop);
