namespace Enigma.Application.Machine;

/// <summary>Replaces the machine with a new M3 or M4.</summary>
public sealed record CreateMachine(string Model);

/// <summary>Inserts rotors from the box, listed from left to right.</summary>
public sealed record InsertRotors(IReadOnlyList<string> Rotors);

/// <summary>Lifts all rotors out of the machine into the box.</summary>
public sealed record RemoveRotors;

/// <summary>Sets the ring (1–26) of a rotor in the box.</summary>
public sealed record SetRingSetting(string Rotor, int RingSetting);

public sealed record SetReflector(string Reflector);

/// <summary>Connects a plug pair such as "AT".</summary>
public sealed record ConnectPlug(string Pair);

/// <summary>Removes the cable plugged into <see cref="Letter"/>.</summary>
public sealed record DisconnectPlug(string Letter);

/// <summary>Turns the rotor in <see cref="Slot"/> until its window shows <see cref="Position"/>.</summary>
public sealed record TurnRotor(string Slot, string Position);

public sealed record PressKey(string Key);

public sealed record ReleaseKey;

public sealed record GetMachineState;
