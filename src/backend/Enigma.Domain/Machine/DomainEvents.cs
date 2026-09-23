namespace Enigma.Domain.Machine;

public interface IDomainEvent;

/// <summary>The rotors stepped; positions are listed from left to right.</summary>
public sealed record RotorsStepped(IReadOnlyList<RotorPosition> Positions) : IDomainEvent;

public sealed record LampLit(Letter Lamp) : IDomainEvent;
