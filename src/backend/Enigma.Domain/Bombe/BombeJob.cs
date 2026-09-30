using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// A Bombe job: the message and its cipher text, the crib and where it is placed, the menu, and the settings a run
/// uses (input letter, diagonal board and reflector), and the copies of the menu on the machine with their drums.
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

    /// <summary>The input letter as set, or null for the default.</summary>
    public Letter? ChosenInput => _input;

    public bool DiagonalBoard { get; private set; } = true;

    public ReflectorType Reflector { get; private set; } = ReflectorType.B;

    /// <summary>The copies of the menu on the machine; none without a menu.</summary>
    public IReadOnlyList<MenuCopy> Copies { get; private set; } = [];

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
        PlugUp(Menu.Build(placement));
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
        PlugUp(testRegister is { } letter ? new Menu(chosen, letter) : Menu.Create(chosen));
    }

    /// <summary>Builds the menu from the placement again.</summary>
    public void BuildMenu() =>
        PlugUp(Menu.Build(Placement ?? throw new DomainException("Place the crib first.")));

    /// <summary>Sets the run settings. A null input letter uses the default (see <see cref="Input"/>).</summary>
    public void Configure(Letter? input, bool diagonalBoard, ReflectorType reflector)
    {
        ArgumentNullException.ThrowIfNull(reflector);

        if (reflector.IsThin)
        {
            throw new DomainException("The three-rotor Bombe takes reflector B or C.");
        }

        _input = input;
        DiagonalBoard = diagonalBoard;
        Reflector = reflector;
    }

    /// <summary>Fits drums of <paramref name="rotor"/> in a row (0 = upper) of a copy, or takes them out when null.</summary>
    public void FitDrums(int copy, int row, RotorType? rotor) => CopyAt(copy).Fit(row, rotor);

    /// <summary>Sets the start letters of a scrambler (0 = the first menu link) of a copy.</summary>
    public void TurnScrambler(int copy, int scrambler, DrumPosition start) => CopyAt(copy).Turn(scrambler, start);

    /// <summary>
    /// The copies a run tests: those with drums in all three rows. Refused when a copy has drums in only some rows, or
    /// when no copy has drums.
    /// </summary>
    public IReadOnlyList<MenuCopy> FittedCopies()
    {
        if (Menu is null)
        {
            throw new DomainException("Build a menu first.");
        }

        if (Copies.Select((copy, index) => (copy, index)).FirstOrDefault(c => c.copy is { IsEmpty: false, WheelOrder: null }) is { copy: not null } partial)
        {
            throw new DomainException($"Fit drums in all three rows of copy {partial.index + 1}, or take them all out.");
        }

        IReadOnlyList<MenuCopy> fitted = [.. Copies.Where(copy => copy.WheelOrder is not null)];
        return fitted.Count > 0 ? fitted : throw new DomainException("Fit the drums of at least one copy of the menu.");
    }

    private static bool Same(MenuLink a, MenuLink b) =>
        a.Offset == b.Offset
        && ((a.First == b.First && a.Second == b.Second) || (a.First == b.Second && a.Second == b.First));

    private MenuCopy CopyAt(int copy) =>
        copy >= 0 && copy < Copies.Count
            ? Copies[copy]
            : throw new DomainException(Menu is null ? "Build a menu first." : $"The menu fits {Copies.Count} times on the Bombe; there is no copy {copy + 1}.");

    private void ClearPlacement()
    {
        Placement = null;
        PlugUp(null);
    }

    // Plugs up the menu once per copy that fits. Copies that stay keep their drums; the start letters follow the menu.
    private void PlugUp(Menu? menu)
    {
        MenuCopy[] copies = menu is null ? [] : Enumerable.Range(0, menu.Copies).Select(_ => new MenuCopy(menu)).ToArray();
        foreach (var (copy, old) in copies.Zip(Copies))
        {
            copy.FitLike(old);
        }

        Menu = menu;
        Copies = copies;
    }
}
