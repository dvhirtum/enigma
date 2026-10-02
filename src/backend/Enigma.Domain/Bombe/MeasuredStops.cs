using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// The stops per wheel order a menu gives with and without the diagonal board, measured by running it on a fixed sample
/// of <see cref="Samples"/> wheel orders and reflectors.
/// </summary>
public sealed record MeasuredStops(double WithBoard, double WithoutBoard)
{
    /// <summary>The wheel orders and reflectors the menu is run on.</summary>
    public const int Samples = 6;

    private const int Seed = 1;

    public static MeasuredStops Of(Menu menu)
    {
        ArgumentNullException.ThrowIfNull(menu);

        var random = new Random(Seed);
        ReflectorType[] reflectors = [ReflectorType.B, ReflectorType.C];
        var scramblers = Enumerable.Range(0, Samples)
            .Select(_ => new Scrambler(WheelOrder.All[random.Next(WheelOrder.All.Count)], reflectors[random.Next(reflectors.Length)]))
            .ToArray();
        var input = menu.TestRegister == Letter.A ? Letter.FromChar('B') : Letter.A;
        var stops = new int[Samples * 2];
        Parallel.For(0, stops.Length, run =>
            stops[run] = new BombeMachine(scramblers[run / 2], menu, input, diagonalBoard: run % 2 == 0).Run().Count());

        return new MeasuredStops(
            stops.Where((_, run) => run % 2 == 0).Average(),
            stops.Where((_, run) => run % 2 == 1).Average());
    }
}
