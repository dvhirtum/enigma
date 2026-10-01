namespace Enigma.Application.Machine;

/// <summary>Replaces the machine with a new M3 or M4.</summary>
public sealed record CreateMachine(string Model);

/// <summary>Puts <see cref="Rotor"/> from the box into <see cref="Slot"/>. A rotor already there goes back to the box.</summary>
public sealed record InsertRotor(string Slot, string Rotor);

/// <summary>Lifts the rotor in <see cref="Slot"/> out of the machine into the box.</summary>
public sealed record RemoveRotor(string Slot);

/// <summary>Sets the ring (1–26) of a rotor in the box.</summary>
public sealed record SetRingSetting(string Rotor, int RingSetting);

public sealed record SetReflector(string Reflector);

/// <summary>Connects a plug pair such as "AT".</summary>
public sealed record ConnectPlug(string Pair);

/// <summary>Removes the cable plugged into <see cref="Letter"/>.</summary>
public sealed record DisconnectPlug(string Letter);

/// <summary>Moves the cable end plugged into <see cref="From"/> to the free socket <see cref="To"/>.</summary>
public sealed record MovePlug(string From, string To);

/// <summary>Turns the rotor in <see cref="Slot"/> until its window shows <see cref="Position"/>.</summary>
public sealed record TurnRotor(string Slot, string Position);

public sealed record PressKey(string Key);

public sealed record ReleaseKey;

/// <summary>Clears the record of lit lamps.</summary>
public sealed record ClearLamps;

public sealed record GetMachineState;

/// <summary>
/// Replaces the machine with one set up with a whole key: the reflector, the rotors left to right (three for an M3,
/// four for an M4), their rings (1–26), plug pairs such as "AT" and the window letters.
/// </summary>
public sealed record SetUpMachine(string Reflector, IReadOnlyList<string> Rotors, IReadOnlyList<int> Rings, IReadOnlyList<string> Plugs, string Positions);
