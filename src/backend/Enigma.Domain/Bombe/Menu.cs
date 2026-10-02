using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
///     The links of a crib that are plugged up on the Bombe, one scrambler each, and the letter the test register watches.
///     Only the connected part around the test register letter tests the drum positions; its loops (closures) reject them.
/// </summary>
public sealed class Menu
{
    /// <summary>The scramblers of a chain (a bank of 12).</summary>
    public const int ChainLinks = 12;

    /// <summary>The Bombe's three chains.</summary>
    public const int Chains = 3;

    /// <summary>The Bombe's 36 scramblers, three chains of 12.</summary>
    public const int MaxLinks = ChainLinks * Chains;

    // The chance that the stecker partners guessed for two menu letters contradict each other: both the same letter,
    // or one pointing at the other without the reverse.
    private const double Contradiction = (Letter.Count + 2.0 * (Letter.Count - 1)) / (Letter.Count * Letter.Count);

    public Menu(IReadOnlyList<MenuLink> links, Letter testRegister)
    {
        ArgumentNullException.ThrowIfNull(links);

        if (links.Count == 0) throw new DomainException("The menu has no links.");

        if (links.Count > MaxLinks)
            throw new DomainException($"The menu has {links.Count} links; the Bombe has {MaxLinks} scramblers.");

        if (links.GroupBy(link => link.Offset).FirstOrDefault(group => group.Count() > 1) is { } duplicate)
            throw new DomainException($"The menu has more than one link at offset {duplicate.Key}.");

        if (!links.Any(link => link.First == testRegister || link.Second == testRegister))
            throw new DomainException($"The test register letter {testRegister} is not on the menu.");

        Links = [.. links];
        TestRegister = testRegister;
    }

    public IReadOnlyList<MenuLink> Links { get; }

    /// <summary>The menu letter whose cable the test register watches.</summary>
    public Letter TestRegister { get; }

    /// <summary>The letters on the menu, A to Z.</summary>
    public IReadOnlyList<Letter> Letters => LettersOf(Links);

    /// <summary>The links connected to the test register letter.</summary>
    public IReadOnlyList<MenuLink> ConnectedLinks => Connected(Links, TestRegister);

    /// <summary>The loops (closures) in the part connected to the test register letter.</summary>
    public int Loops => Closures(ConnectedLinks);

    /// <summary>The chains one copy of the menu takes: a chain per 12 links.</summary>
    public int ChainsPerCopy => (Links.Count + ChainLinks - 1) / ChainLinks;

    /// <summary>The copies of the menu that fit on the Bombe, each tested with its own wheel order.</summary>
    public int Copies => Chains / ChainsPerCopy;

    /// <summary>
    ///     A menu with the test register on the letter with the most links, then the most loops through it, then the
    ///     first in the alphabet.
    /// </summary>
    public static Menu Create(IReadOnlyList<MenuLink> links)
    {
        ArgumentNullException.ThrowIfNull(links);

        var testRegister = LettersOf(links)
            .OrderByDescending(letter => LinksAt(links, letter))
            .ThenByDescending(letter => LoopsThrough(links, letter))
            .ThenBy(letter => letter.Index)
            .FirstOrDefault();
        return new Menu(links, testRegister);
    }

    /// <summary>
    ///     Builds the menu from the connected part of the crib with the fewest estimated stops, on one chain. Above
    ///     <see cref="ChainLinks" /> links, links at the ends of chains go first, then links on loops: each time the one whose
    ///     loss leaves the fewest estimated stops, the lowest offset on a tie.
    /// </summary>
    public static Menu Build(CribPlacement placement)
    {
        ArgumentNullException.ThrowIfNull(placement);

        var links = placement.Links;
        var best = LettersOf(links)
            .Select(letter => Connected(links, letter))
            .DistinctBy(part => part[0].Offset)
            .Select(Trim)
            .OrderBy(part => Estimate(part, true))
            .ThenByDescending(part => part.Count)
            .ThenBy(part => part[0].Offset)
            .First();
        return Create(best);
    }

    public int LinksAt(Letter letter)
    {
        return LinksAt(Links, letter);
    }

    /// <summary>The loops that would be lost if the letter were taken off the menu.</summary>
    public int LoopsThrough(Letter letter)
    {
        return LoopsThrough(Links, letter);
    }

    /// <summary>
    ///     A quick rating of the false stops per wheel order, from the letters and loops connected to the test register, used
    ///     to compare menus. Each loop passes a wrong position with a chance of 1 in 26. The diagonal board also rejects the
    ///     positions at which the stecker partners implied for the menu letters contradict each other, taken pair by pair as
    ///     if independent, so with many letters it rates far too low; <see cref="MeasuredStops" /> measures a menu.
    /// </summary>
    public double EstimatedStops(bool diagonalBoard)
    {
        return Estimate(ConnectedLinks, diagonalBoard);
    }

    public override string ToString()
    {
        return string.Join(' ', Links);
    }

    private static double Estimate(IReadOnlyList<MenuLink> links, bool diagonalBoard)
    {
        var letters = LettersOf(links).Count;
        var consistent = diagonalBoard ? Math.Pow(1 - Contradiction, letters * (letters - 1) / 2.0) : 1;
        var expected = Math.Pow(Letter.Count, 1 - Closures(links)) * consistent;
        return DrumPosition.Count * (1 - Math.Exp(-expected));
    }

    private static IReadOnlyList<MenuLink> Trim(IReadOnlyList<MenuLink> links)
    {
        var trimmed = links.ToList();
        while (trimmed.Count > ChainLinks)
        {
            var ends = trimmed.Where(link => LinksAt(trimmed, link.First) == 1 || LinksAt(trimmed, link.Second) == 1)
                .ToList();
            var candidates = ends.Count > 0
                ? ends
                : [.. trimmed.Where(link => Components([.. trimmed.Where(other => other != link)]) == 1)];
            var drop = candidates
                .OrderBy(link => Estimate([.. trimmed.Where(other => other != link)], true))
                .ThenBy(link => link.Offset)
                .First();
            trimmed.Remove(drop);
        }

        return trimmed;
    }

    private static int LinksAt(IReadOnlyList<MenuLink> links, Letter letter)
    {
        return links.Count(link => link.First == letter || link.Second == letter);
    }

    private static int LoopsThrough(IReadOnlyList<MenuLink> links, Letter letter)
    {
        return Closures(links) - Closures([.. links.Where(link => link.First != letter && link.Second != letter)]);
    }

    private static IReadOnlyList<Letter> LettersOf(IReadOnlyList<MenuLink> links)
    {
        return
        [
            .. links.SelectMany(link => new[] { link.First, link.Second }).Distinct().OrderBy(letter => letter.Index)
        ];
    }

    private static IReadOnlyList<MenuLink> Connected(IReadOnlyList<MenuLink> links, Letter letter)
    {
        var roots = Roots(links);
        return [.. links.Where(link => roots[link.First.Index] == roots[letter.Index])];
    }

    // Links minus letters plus connected parts: the links that close a loop.
    private static int Closures(IReadOnlyList<MenuLink> links)
    {
        return links.Count - LettersOf(links).Count + Components(links);
    }

    private static int Components(IReadOnlyList<MenuLink> links)
    {
        var roots = Roots(links);
        return LettersOf(links).Select(letter => roots[letter.Index]).Distinct().Count();
    }

    private static int[] Roots(IReadOnlyList<MenuLink> links)
    {
        var parents = Enumerable.Range(0, Letter.Count).ToArray();

        int Find(int letter)
        {
            return parents[letter] == letter ? letter : parents[letter] = Find(parents[letter]);
        }

        foreach (var link in links) parents[Find(link.First.Index)] = Find(link.Second.Index);

        return [.. Enumerable.Range(0, Letter.Count).Select(Find)];
    }
}
