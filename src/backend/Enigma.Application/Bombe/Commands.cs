namespace Enigma.Application.Bombe;

/// <summary>Replaces the cipher text. Spaces and line breaks are ignored.</summary>
public sealed record SetCipherText(string? Text);

/// <summary>Replaces the crib, or removes it when empty.</summary>
public sealed record SetCrib(string? Crib);

/// <summary>Places the crib under the cipher text (0 = the first letter) and builds the menu.</summary>
public sealed record PlaceCrib(int Position);

/// <summary>Plugs up links of the placement, such as "SW1". Without a test register letter it is chosen.</summary>
public sealed record SetMenu(IReadOnlyList<string>? Links, string? TestRegister);

public sealed record BuildMenu;

/// <summary>
/// The run settings. A null input letter uses the default; a null diagonal board keeps it as it is. Wheel orders are
/// written as "II V III".
/// </summary>
public sealed record ConfigureBombe(string? Input, bool? DiagonalBoard, string? Reflector, IReadOnlyList<string>? WheelOrders);

/// <summary>Starts a run at <see cref="Speed"/> positions per second, or at full speed when null.</summary>
public sealed record StartRun(double? Speed);

/// <summary>Sets the speed of the run in positions per second, or full speed when null.</summary>
public sealed record SetRunSpeed(double? Speed);

public sealed record CancelRun;

public sealed record GetBombeState;

public sealed record GetRun;

/// <summary>The stops of the run from the <see cref="From"/>th on.</summary>
public sealed record GetStops(int From);
