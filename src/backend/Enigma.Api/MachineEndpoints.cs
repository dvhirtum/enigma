using Enigma.Application.Machine;

namespace Enigma.Api;

internal sealed record RingSettingRequest(int RingSetting);

internal sealed record RotorRequest(string Rotor);

internal sealed record PositionRequest(string Position);

internal sealed record PlugMoveRequest(string To);

internal static class MachineEndpoints
{
    public static IServiceCollection AddMachineHandlers(this IServiceCollection services) => services
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

    public static void MapMachineEndpoints(this IEndpointRouteBuilder app)
    {
        var machine = app.MapGroup("/api/machine");

        machine.MapGet("/", (GetMachineStateHandler handler) =>
            handler.Handle(new GetMachineState()));

        machine.MapPost("/", (CreateMachine command, CreateMachineHandler handler) =>
            handler.Handle(command));

        machine.MapPut("/key", (SetUpMachine command, SetUpMachineHandler handler) =>
            handler.Handle(command));

        machine.MapPut("/rotors/{slot}", (string slot, RotorRequest request, InsertRotorHandler handler) =>
            handler.Handle(new InsertRotor(slot, request.Rotor)));

        machine.MapDelete("/rotors/{slot}", (string slot, RemoveRotorHandler handler) =>
            handler.Handle(new RemoveRotor(slot)));

        machine.MapPut("/rotors/{slot}/position", (string slot, PositionRequest request, TurnRotorHandler handler) =>
            handler.Handle(new TurnRotor(slot, request.Position)));

        machine.MapPut("/rotor-box/{rotor}/ring", (string rotor, RingSettingRequest request, SetRingSettingHandler handler) =>
            handler.Handle(new SetRingSetting(rotor, request.RingSetting)));

        machine.MapPut("/reflector", (SetReflector command, SetReflectorHandler handler) =>
            handler.Handle(command));

        machine.MapPost("/plugs", (ConnectPlug command, ConnectPlugHandler handler) =>
            handler.Handle(command));

        machine.MapDelete("/plugs/{letter}", (string letter, DisconnectPlugHandler handler) =>
            handler.Handle(new DisconnectPlug(letter)));

        machine.MapPut("/plugs/{letter}", (string letter, PlugMoveRequest request, MovePlugHandler handler) =>
            handler.Handle(new MovePlug(letter, request.To)));

        machine.MapPost("/keyboard/press", (PressKey command, PressKeyHandler handler) =>
            handler.Handle(command));

        machine.MapPost("/keyboard/release", (ReleaseKeyHandler handler) =>
            handler.Handle(new ReleaseKey()));

        machine.MapDelete("/lamps", (ClearLampsHandler handler) =>
            handler.Handle(new ClearLamps()));
    }
}
