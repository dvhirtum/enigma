using Enigma.Application.Machine;

namespace Enigma.Api;

internal sealed record RingSettingRequest(int RingSetting);

internal sealed record PositionRequest(string Position);

internal static class MachineEndpoints
{
    public static IServiceCollection AddMachineHandlers(this IServiceCollection services) => services
        .AddSingleton<CreateMachineHandler>()
        .AddSingleton<InsertRotorsHandler>()
        .AddSingleton<RemoveRotorsHandler>()
        .AddSingleton<SetRingSettingHandler>()
        .AddSingleton<SetReflectorHandler>()
        .AddSingleton<ConnectPlugHandler>()
        .AddSingleton<DisconnectPlugHandler>()
        .AddSingleton<TurnRotorHandler>()
        .AddSingleton<PressKeyHandler>()
        .AddSingleton<ReleaseKeyHandler>()
        .AddSingleton<GetMachineStateHandler>();

    public static void MapMachineEndpoints(this IEndpointRouteBuilder app)
    {
        var machine = app.MapGroup("/api/machine");

        machine.MapGet("/", (GetMachineStateHandler handler) =>
            handler.Handle(new GetMachineState()));

        machine.MapPost("/", (CreateMachine command, CreateMachineHandler handler) =>
            handler.Handle(command));

        machine.MapPut("/rotors", (InsertRotors command, InsertRotorsHandler handler) =>
            handler.Handle(command));

        machine.MapDelete("/rotors", (RemoveRotorsHandler handler) =>
            handler.Handle(new RemoveRotors()));

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

        machine.MapPost("/keyboard/press", (PressKey command, PressKeyHandler handler) =>
            handler.Handle(command));

        machine.MapPost("/keyboard/release", (ReleaseKeyHandler handler) =>
            handler.Handle(new ReleaseKey()));
    }
}
