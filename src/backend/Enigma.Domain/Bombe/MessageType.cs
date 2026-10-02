namespace Enigma.Domain.Bombe;

/// <summary>
///     A kind of stereotyped Navy message: its name, the hint given with an exercise, its likely crib and where in the
///     message the crib is likely to stand.
/// </summary>
public sealed record MessageType(string Id, string Name, string Hint, Crib Crib, string Place)
{
    private const string AfterPrefix = "At or near the start, after at most a short prefix such as ";

    public static MessageType Weather { get; } = new(
        "weather",
        "Weather forecast",
        "A weather forecast. Forecasts start with a fixed heading.",
        Crib.Parse("WETTERVORHERSAGE"),
        AfterPrefix + "AN ALLE or the hour.");

    public static MessageType NothingToReport { get; } = new(
        "nothing-to-report",
        "Nothing to report",
        "A routine report from a patrol vessel that had nothing to report.",
        Crib.Parse("KEINEBESONDERENEREIGNISSE"),
        AfterPrefix + "the sending vessel or the hour.");

    public static MessageType OwnPosition { get; } = new(
        "own-position",
        "U-boat position report",
        "A U-boat reporting its own position, course and speed.",
        Crib.Parse("EIGENERSTANDORTQU"),
        AfterPrefix + "AN BDU or the U-boat's number.");

    public static MessageType Convoy { get; } = new(
        "convoy",
        "Convoy report",
        "A U-boat reporting a convoy to the U-boat command.",
        Crib.Parse("FEINDLICHERGELEITZUG"),
        AfterPrefix + "AN BDU or the U-boat's number.");

    public static IReadOnlyList<MessageType> All { get; } = [Weather, NothingToReport, OwnPosition, Convoy];

    /// <summary>The message type with <paramref name="id" />, or null.</summary>
    public static MessageType? Find(string id)
    {
        return All.FirstOrDefault(type => type.Id == id);
    }
}
