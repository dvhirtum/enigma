using Enigma.Application.Machine;

namespace Enigma.Api;

internal sealed record RingSettingRequest(int RingSetting);

internal sealed record RotorRequest(string Rotor);

internal sealed record PositionRequest(string Position);

internal sealed record PlugMoveRequest(string To);

internal static class MachineEndpoints
{
    public static IServiceCollection AddMachineHandlers(this IServiceCollection services)
    {
        return services
            .AddSingleton<CreateMachineHandler>()
            .AddSingleton<InsertRotorHandler>()
            .AddSingleton<RemoveRotorHandler>()
            .AddSingleton<SetRingSettingHandler>()
            .AddSingleton<SetReflectorHandler>()
            .AddSingleton<ConnectPlugHandler>()
            .AddSingleton<DisconnectPlugHandler>()
            .AddSingleton<MovePlugHandler>()
            .AddSingleton<TurnRotorHandler>()
            .AddSingleton<PressKeyHandler>()
            .AddSingleton<ReleaseKeyHandler>()
            .AddSingleton<ClearLampsHandler>()
            .AddSingleton<GetMachineStateHandler>()
            .AddSingleton<SetUpMachineHandler>();
    }

    public static void MapMachineEndpoints(this IEndpointRouteBuilder app)
    {
        var machine = app.MapGroup("/api/machine")
            .WithTags("Machine")
            .ProducesProblem(StatusCodes.Status400BadRequest);

        machine.MapGet("/", (GetMachineStateHandler handler) =>
                handler.Handle(new GetMachineState()))
            .WithSummary("Gets the machine state.");

        machine.MapPost("/", (CreateMachine command, CreateMachineHandler handler) =>
                handler.Handle(command))
            .WithSummary("Replaces the machine with a default machine of the model.");

        machine.MapPut("/key", (SetUpMachine command, SetUpMachineHandler handler) =>
                handler.Handle(command))
            .WithSummary("Replaces the machine with one set up with the whole key, all or nothing.");

        machine.MapPut("/rotors/{slot}", (string slot, RotorRequest request, InsertRotorHandler handler) =>
                handler.Handle(new InsertRotor(slot, request.Rotor)))
            .WithSummary("Puts a rotor from the box into a slot; a rotor already there goes back to the box.");

        machine.MapDelete("/rotors/{slot}", (string slot, RemoveRotorHandler handler) =>
                handler.Handle(new RemoveRotor(slot)))
            .WithSummary("Puts the rotor in a slot back in the box.");

        machine.MapPut("/rotors/{slot}/position", (string slot, PositionRequest request, TurnRotorHandler handler) =>
                handler.Handle(new TurnRotor(slot, request.Position)))
            .WithSummary("Turns the rotor in a slot to a window letter.");

        machine.MapPut("/rotor-box/{rotor}/ring",
                (string rotor, RingSettingRequest request, SetRingSettingHandler handler) =>
                    handler.Handle(new SetRingSetting(rotor, request.RingSetting)))
            .WithSummary("Sets the ring (1–26) of a rotor in the box.");

        machine.MapPut("/reflector", (SetReflector command, SetReflectorHandler handler) =>
                handler.Handle(command))
            .WithSummary("Fits a reflector.");

        machine.MapPost("/plugs", (ConnectPlug command, ConnectPlugHandler handler) =>
                handler.Handle(command))
            .WithSummary("Plugs a cable between two letters.");

        machine.MapDelete("/plugs/{letter}", (string letter, DisconnectPlugHandler handler) =>
                handler.Handle(new DisconnectPlug(letter)))
            .WithSummary("Removes the cable plugged into a letter.");

        machine.MapPut("/plugs/{letter}", (string letter, PlugMoveRequest request, MovePlugHandler handler) =>
                handler.Handle(new MovePlug(letter, request.To)))
            .WithSummary("Moves one end of a cable to a free socket.");

        machine.MapPost("/keyboard/press", (PressKey command, PressKeyHandler handler) =>
                handler.Handle(command))
            .WithSummary("Holds a key down: the rotors step and a lamp lights.");

        machine.MapPost("/keyboard/release", (ReleaseKeyHandler handler) =>
                handler.Handle(new ReleaseKey()))
            .WithSummary("Releases the held key.");

        machine.MapDelete("/lamps", (ClearLampsHandler handler) =>
                handler.Handle(new ClearLamps()))
            .WithSummary("Clears the record of lit lamps.");
    }
}
