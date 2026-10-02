using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// A Bombe job: the message and its cipher text, the crib and where it is placed, the menu, the settings a run uses
/// (diagonal board and reflector), and the machines: the Bombe and the checking machine, both set up by hand.
/// </summary>
public sealed class BombeJob
{
    /// <summary>The message being broken, or null before one is loaded.</summary>
    public MessageSource? Source { get; private set; }

    public IReadOnlyList<Letter> CipherText => Source?.CipherText ?? [];

    public Crib? Crib { get; private set; }

    public CribPlacement? Placement { get; private set; }

    public Menu? Menu { get; private set; }

    public bool DiagonalBoard { get; private set; } = true;

    public ReflectorType Reflector { get; private set; } = ReflectorType.B;

    /// <summary>The Bombe's chains, cables and drums.</summary>
    public BombeSetup Machine { get; } = new();

    public CheckingMachine Checker { get; } = new();

    /// <summary>The day's traffic, read with a pinch of the message's key sheet day, or null before the pinch.</summary>
    public DayTraffic? Traffic { get; private set; }

    /// <summary>Whether the message's three wheel orders have been shown.</summary>
    public bool WheelOrdersShown { get; private set; }

    /// <summary>Every position the crib fits under the cipher text, crashed or not.</summary>
    public IReadOnlyList<CribPlacement> Placements => Crib is null ? [] : CribPlacement.All(CipherText, Crib);

    /// <summary>
    /// Loads a message to break, or none when null. The crib, its placement, the menu, the day's traffic and the shown
    /// wheel orders are cleared.
    /// </summary>
    public void Load(MessageSource? source)
    {
        Source = source;
        Crib = null;
        Traffic = null;
        WheelOrdersShown = false;
        ClearPlacement();
    }

    /// <summary>Shows the message's three wheel orders, one of them the key's.</summary>
    public void ShowWheelOrders()
    {
        if (Source?.WheelOrders is null)
        {
            throw new DomainException("This message has no known wheel order.");
        }

        WheelOrdersShown = true;
    }

    /// <summary>Replaces the crib, or removes it when null. The placement and the menu are cleared.</summary>
    public void SetCrib(Crib? crib)
    {
        Crib = crib;
        ClearPlacement();
    }

    /// <summary>Places the crib at <paramref name="position"/> and builds the menu from it.</summary>
    public void Place(int position)
    {
        var crib = Crib ?? throw new DomainException("Enter a crib first.");
        var placement = new CribPlacement(CipherText, crib, position);
        if (placement.Crashed)
        {
            throw new DomainException($"The crib crashes at position {position}.");
        }

        Placement = placement;
        Menu = Menu.Build(placement);
    }

    /// <summary>
    /// Draws a menu by hand from links of the placement. Without a test register letter it is chosen as in
    /// <see cref="Bombe.Menu.Create"/>.
    /// </summary>
    public void SetMenu(IReadOnlyList<MenuLink> links, Letter? testRegister)
    {
        ArgumentNullException.ThrowIfNull(links);

        var placement = Placement ?? throw new DomainException("Place the crib first.");
        IReadOnlyList<MenuLink> chosen = [.. links.Select(link => placement.Links.FirstOrDefault(own => Same(own, link))
            ?? throw new DomainException($"{link} is not a link of the crib at position {placement.Position}."))];
        Menu = testRegister is { } letter ? new Menu(chosen, letter) : Menu.Create(chosen);
    }

    /// <summary>Builds the menu from the placement again.</summary>
    public void BuildMenu() => Menu = Menu.Build(Placement ?? throw new DomainException("Place the crib first."));

    /// <summary>Plugs up the Bombe with the menu.</summary>
    public void PlugUpMenu() => Machine.PlugUp(Menu ?? throw new DomainException("Draw a menu first."));

    /// <summary>
    /// Takes a pinch of the key sheet day: the loaded radio message is read with it, along with <paramref name="others"/>,
    /// the day's other messages.
    /// </summary>
    public void TakePinch(Pinch pinch, IEnumerable<DayMessage> others)
    {
        var message = Source?.Message ?? throw new DomainException("Load a Navy radio message first: bare cipher text has no indicator.");
        Traffic = new DayTraffic(pinch, message, others);
    }

    /// <summary>Sets the run settings.</summary>
    public void Configure(bool diagonalBoard, ReflectorType reflector)
    {
        ArgumentNullException.ThrowIfNull(reflector);

        if (reflector.IsThin)
        {
            throw new DomainException("The three-rotor Bombe takes reflector B or C.");
        }

        DiagonalBoard = diagonalBoard;
        Reflector = reflector;
    }

    private static bool Same(MenuLink a, MenuLink b) =>
        a.Offset == b.Offset
        && ((a.First == b.First && a.Second == b.Second) || (a.First == b.Second && a.Second == b.First));

    private void ClearPlacement()
    {
        Placement = null;
        Menu = null;
    }
}
