using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// A Bombe job: the message and its cipher text, the crib and where it is placed, the menu, and the settings a run
/// uses (input letter, diagonal board, reflector and wheel orders).
/// </summary>
public sealed class BombeJob
{
    private Letter? _input;

    /// <summary>The message being broken, or null before one is loaded.</summary>
    public MessageSource? Source { get; private set; }

    public IReadOnlyList<Letter> CipherText => Source?.CipherText ?? [];

    public Crib? Crib { get; private set; }

    public CribPlacement? Placement { get; private set; }

    public Menu? Menu { get; private set; }

    /// <summary>The live wire on the test register cable: as set, or A (B when the test register is on A).</summary>
    public Letter Input => _input ?? (Menu?.TestRegister == Letter.A ? Letter.A.Shift(1) : Letter.A);

    public bool DiagonalBoard { get; private set; } = true;

    public ReflectorType Reflector { get; private set; } = ReflectorType.B;

    public IReadOnlyList<WheelOrder> WheelOrders { get; private set; } = WheelOrder.All;

    /// <summary>Every position the crib fits under the cipher text, crashed or not.</summary>
    public IReadOnlyList<CribPlacement> Placements => Crib is null ? [] : CribPlacement.All(CipherText, Crib);

    /// <summary>Loads a message to break, or none when null. The crib, its placement and the menu are cleared.</summary>
    public void Load(MessageSource? source)
    {
        Source = source;
        Crib = null;
        ClearPlacement();
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
    /// Plugs up a menu by hand from links of the placement. Without a test register letter it is chosen as in
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
    public void BuildMenu() =>
        Menu = Menu.Build(Placement ?? throw new DomainException("Place the crib first."));

    /// <summary>Sets the run settings. A null input letter uses the default (see <see cref="Input"/>).</summary>
    public void Configure(Letter? input, bool diagonalBoard, ReflectorType reflector, IReadOnlyList<WheelOrder> wheelOrders)
    {
        ArgumentNullException.ThrowIfNull(reflector);
        ArgumentNullException.ThrowIfNull(wheelOrders);

        if (reflector.IsThin)
        {
            throw new DomainException("The three-rotor Bombe takes reflector B or C.");
        }

        if (wheelOrders.Count == 0)
        {
            throw new DomainException("Choose at least one wheel order.");
        }

        if (wheelOrders.Distinct().Count() < wheelOrders.Count)
        {
            throw new DomainException("A wheel order is chosen more than once.");
        }

        _input = input;
        DiagonalBoard = diagonalBoard;
        Reflector = reflector;
        WheelOrders = [.. wheelOrders];
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
