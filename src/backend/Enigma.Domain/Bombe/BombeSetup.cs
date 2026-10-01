using Enigma.Domain.Machine;

namespace Enigma.Domain.Bombe;

/// <summary>
/// A scrambler of the Bombe as set up by hand: the letters its two jacks are cabled to (null when unplugged), the rotor
/// of each drum (upper, middle, lower; null when empty) and the letters its drums start at.
/// </summary>
public sealed class ScramblerSetup
{
    internal Letter?[] Jacks { get; } = new Letter?[2];

    internal RotorType?[] Drums { get; } = new RotorType?[3];

    public IReadOnlyList<Letter?> Cables => Jacks;

    public IReadOnlyList<RotorType?> Rotors => Drums;

    public DrumPosition Start { get; internal set; } = DrumPosition.ZZZ;

    public bool IsCabled => Jacks is [not null, not null];

    public bool HasCable => Jacks.Any(jack => jack is not null);

    /// <summary>The wheel order of its drums, or null until all three are fitted.</summary>
    public WheelOrder? WheelOrder =>
        Drums is [{ } upper, { } middle, { } lower] ? new WheelOrder(upper, middle, lower) : null;
}

/// <summary>
/// A chain (bank) of 12 scramblers, with the letter its test register is plugged onto (null when not plugged) and the
/// input wire as set (null: A, or B when the test register is on A).
/// </summary>
public sealed class ChainSetup
{
    internal ChainSetup() =>
        Scramblers = [.. Enumerable.Range(0, BombeSetup.ScramblersPerChain).Select(_ => new ScramblerSetup())];

    public IReadOnlyList<ScramblerSetup> Scramblers { get; }

    public Letter? TestRegister { get; internal set; }

    public Letter? ChosenInput { get; internal set; }

    /// <summary>The live wire on the test register cable: as set, or A (B when the test register is on A).</summary>
    public Letter Input => ChosenInput ?? (TestRegister == Letter.A ? Letter.A.Shift(1) : Letter.A);

    /// <summary>The rotor in each row, or null where the row has no drums.</summary>
    public IReadOnlyList<RotorType?> Rows =>
        [.. Enumerable.Range(0, 3).Select(row => Scramblers.Select(s => s.Drums[row]).FirstOrDefault(rotor => rotor is not null))];

    /// <summary>The wheel order of the rows, or null until each row has drums.</summary>
    public WheelOrder? WheelOrder => Rows is [{ } upper, { } middle, { } lower] ? new WheelOrder(upper, middle, lower) : null;
}

/// <summary>Chains joined by cables into one Bombe, with the test register of the first.</summary>
public sealed record ChainGroup(IReadOnlyList<int> Chains, Letter? TestRegister, Letter Input, WheelOrder? WheelOrder);

/// <summary>A group of chains plugged up to run, with its Bombe.</summary>
public sealed record GroupMachine(ChainGroup Group, BombeMachine Machine);

/// <summary>
/// The Bombe as set up by hand: three chains of 12 scramblers. Each chain is a Bombe of its own, with its own commons
/// (one per letter), test register and drums; a join cable links a chain to the next, so they share commons and the
/// first one's test register. A scrambler's jacks are cabled to commons; its drums are fitted row by row from the rack.
/// </summary>
public sealed class BombeSetup
{
    public const int Chains = 3;

    public const int ScramblersPerChain = 12;

    private readonly bool[] _joins = new bool[Chains - 1];

    public BombeSetup() => ChainSetups = [.. Enumerable.Range(0, Chains).Select(_ => new ChainSetup())];

    public IReadOnlyList<ChainSetup> ChainSetups { get; }

    /// <summary>Whether chain n is joined to chain n + 1.</summary>
    public IReadOnlyList<bool> Joins => _joins;

    /// <summary>The menu the Bombe was last plugged up with, until its cables, test registers, joins or start letters are changed by hand.</summary>
    public Menu? PluggedMenu { get; private set; }

    /// <summary>The chains joined into one Bombe each, in order.</summary>
    public IReadOnlyList<ChainGroup> Groups
    {
        get
        {
            var groups = new List<ChainGroup>();
            var chains = new List<int>();
            for (var chain = 0; chain < Chains; chain++)
            {
                chains.Add(chain);
                if (chain == Chains - 1 || !_joins[chain])
                {
                    var first = ChainSetups[chains[0]];
                    var wheelOrder = chains.Select(c => ChainSetups[c].WheelOrder).FirstOrDefault(order => order is not null);
                    groups.Add(new ChainGroup([.. chains], first.TestRegister, first.Input, wheelOrder));
                    chains = [];
                }
            }

            return groups;
        }
    }

    /// <summary>Cables a jack (0 or 1) of a scrambler to a letter's common, or unplugs it when null.</summary>
    public void Plug(int chain, int scrambler, int jack, Letter? letter)
    {
        if (jack is < 0 or > 1)
        {
            throw new DomainException($"A scrambler has two jacks; there is no jack {jack + 1}.");
        }

        ScramblerAt(chain, scrambler).Jacks[jack] = letter;
        PluggedMenu = null;
    }

    /// <summary>
    /// Fits drums of <paramref name="rotor"/> in a row (0 = upper) of a chain on scramblers 1 up to
    /// <paramref name="upTo"/> + 1, and takes the row's other drums out.
    /// </summary>
    public void FitRow(int chain, int row, int upTo, RotorType rotor)
    {
        ArgumentNullException.ThrowIfNull(rotor);

        CheckRow(row);
        ScramblerAt(chain, upTo);
        if (rotor.IsGreek)
        {
            throw new DomainException("The Bombe takes rotors I–VIII only.");
        }

        var setup = ChainSetups[chain];
        if (Enumerable.Range(0, 3).Any(other => other != row && setup.Scramblers.Any(s => s.Drums[other] == rotor)))
        {
            throw new DomainException($"Drums of rotor {rotor} are already in another row of chain {chain + 1}.");
        }

        for (var index = 0; index < ScramblersPerChain; index++)
        {
            setup.Scramblers[index].Drums[row] = index <= upTo ? rotor : null;
        }
    }

    /// <summary>Takes one drum (row 0 = upper) of a scrambler back to the rack.</summary>
    public void RemoveDrum(int chain, int scrambler, int row)
    {
        CheckRow(row);
        ScramblerAt(chain, scrambler).Drums[row] = null;
    }

    /// <summary>Sets the letters a scrambler's drums start at.</summary>
    public void Turn(int chain, int scrambler, DrumPosition start)
    {
        ScramblerAt(chain, scrambler).Start = start;
        PluggedMenu = null;
    }

    /// <summary>Plugs the test register of a chain onto a letter's common, or unplugs it when null.</summary>
    public void PlugTestRegister(int chain, Letter? letter)
    {
        CheckJoinedIn(chain);
        ChainAt(chain).TestRegister = letter;
        PluggedMenu = null;
    }

    /// <summary>Sets the input wire of a chain's test register, or the default when null.</summary>
    public void SetInput(int chain, Letter? input)
    {
        CheckJoinedIn(chain);
        ChainAt(chain).ChosenInput = input;
    }

    /// <summary>Joins chain <paramref name="join"/> + 1 to the next one, or parts them. The joined chain's test register is unplugged.</summary>
    public void Join(int join, bool joined)
    {
        if (join < 0 || join >= _joins.Length)
        {
            throw new DomainException($"There is no join {join + 1}; chains are joined 1–2 and 2–3.");
        }

        _joins[join] = joined;
        if (joined)
        {
            (ChainSetups[join + 1].TestRegister, ChainSetups[join + 1].ChosenInput) = (null, null);
        }

        PluggedMenu = null;
    }

    /// <summary>
    /// Plugs up a menu once on each chain (or joined chains) it fits: the scramblers cabled to the links' letters in
    /// order and set to their offsets, the test register on the menu's. Each copy's chains take the rotors of the rows
    /// of its first chain, fitted on exactly the cabled scramblers; the other scramblers are unplugged and emptied.
    /// </summary>
    public void PlugUp(Menu menu)
    {
        ArgumentNullException.ThrowIfNull(menu);

        var chainsPerCopy = menu.ChainsPerCopy;
        for (var join = 0; join < _joins.Length; join++)
        {
            _joins[join] = (join + 1) % chainsPerCopy != 0 && join + 1 < menu.Copies * chainsPerCopy;
        }

        var rowsBefore = ChainSetups.Select(setup => setup.Rows).ToArray();
        for (var chain = 0; chain < Chains; chain++)
        {
            var setup = ChainSetups[chain];
            var copy = chain / chainsPerCopy;
            var rows = rowsBefore[copy * chainsPerCopy % Chains];
            var first = chain % chainsPerCopy == 0 && copy < menu.Copies;
            (setup.TestRegister, setup.ChosenInput) = (first ? menu.TestRegister : null, null);
            for (var index = 0; index < ScramblersPerChain; index++)
            {
                var link = ((chain % chainsPerCopy) * ScramblersPerChain) + index;
                var scrambler = setup.Scramblers[index];
                var cabled = copy < menu.Copies && link < menu.Links.Count;
                scrambler.Jacks[0] = cabled ? menu.Links[link].First : null;
                scrambler.Jacks[1] = cabled ? menu.Links[link].Second : null;
                scrambler.Start = cabled ? DrumPosition.FromOffset(menu.Links[link].Offset) : DrumPosition.ZZZ;
                for (var row = 0; row < 3; row++)
                {
                    scrambler.Drums[row] = cabled ? rows[row] : null;
                }
            }
        }

        PluggedMenu = menu;
    }

    /// <summary>
    /// The groups of chains a run tests: those with a test register and at least one scrambler that passes current
    /// (cabled at both jacks, with all three drums), each with those scramblers. Refused when there are none.
    /// </summary>
    public IReadOnlyList<GroupMachine> Machines(ReflectorType reflector, bool diagonalBoard)
    {
        ArgumentNullException.ThrowIfNull(reflector);

        var tables = new Dictionary<WheelOrder, Scrambler>();
        var tested = Groups.Where(group => group.TestRegister is not null).ToList();
        var machines = tested
            .Select(group => (Group: group, Scramblers: Working(group).ToList()))
            .Where(group => group.Scramblers.Count > 0)
            .Select(group => new GroupMachine(group.Group, new BombeMachine(
                [.. group.Scramblers.Select(scrambler => new CabledScrambler(
                    scrambler.Jacks[0]!.Value,
                    scrambler.Jacks[1]!.Value,
                    Table(scrambler.WheelOrder!),
                    scrambler.Start))],
                group.Group.TestRegister!.Value,
                group.Group.Input,
                diagonalBoard)))
            .ToList();
        return machines.Count > 0 ? machines
            : throw new DomainException(tested.Count > 0
                ? "Fit all three drums on a cabled scrambler of a chain with a test register first."
                : "Plug a test register onto a common first.");

        Scrambler Table(WheelOrder order) =>
            tables.TryGetValue(order, out var table) ? table : tables[order] = new Scrambler(order, reflector);
    }

    /// <summary>The scramblers of a group that pass current: cabled at both jacks, with all three drums.</summary>
    private IEnumerable<ScramblerSetup> Working(ChainGroup group) =>
        group.Chains.SelectMany(chain => ChainSetups[chain].Scramblers).Where(scrambler => scrambler is { IsCabled: true, WheelOrder: not null });

    /// <summary>
    /// What a run will not use, per chain: scramblers with one jack cabled, cabled without all drums, or with drums but no
    /// cables; cabled chains without a test register; and chains with a test register that a run leaves out.
    /// </summary>
    public IReadOnlyList<string> Warnings()
    {
        var warnings = new List<string>();
        for (var chain = 0; chain < Chains; chain++)
        {
            var scramblers = ChainSetups[chain].Scramblers;
            int Drums(ScramblerSetup scrambler) => scrambler.Drums.Count(rotor => rotor is not null);
            Add(chain, scramblers, s => s.HasCable && !s.IsCabled, "has only one jack cabled", "have only one jack cabled");
            Add(chain, scramblers, s => s.IsCabled && Drums(s) == 0, "is cabled but has no drums", "are cabled but have no drums");
            Add(chain, scramblers, s => s.IsCabled && Drums(s) is 1 or 2, "is cabled but has drums missing", "are cabled but have drums missing");
            Add(chain, scramblers, s => !s.HasCable && Drums(s) > 0, "has drums but no cables", "have drums but no cables");
        }

        foreach (var group in Groups)
        {
            var scramblers = group.Chains.SelectMany(chain => ChainSetups[chain].Scramblers).ToList();
            var (names, plural) = (ChainNames(group.Chains), group.Chains.Count > 1);
            if (group.TestRegister is null && scramblers.Any(s => s.HasCable))
            {
                warnings.Add($"{names} {(plural ? "have" : "has")} no test register.");
            }
            else if (group.TestRegister is not null && !Working(group).Any())
            {
                warnings.Add($"{names} {(plural ? "have" : "has")} a test register but no scrambler with cables and drums, so the run leaves {(plural ? "them" : "it")} out.");
            }
        }

        return warnings;

        void Add(int chain, IReadOnlyList<ScramblerSetup> scramblers, Func<ScramblerSetup, bool> matches, string one, string many)
        {
            int[] numbers = [.. scramblers.Select((s, index) => (s, index + 1)).Where(pair => matches(pair.s)).Select(pair => pair.Item2)];
            if (numbers.Length > 0)
            {
                warnings.Add(numbers.Length == 1
                    ? $"Chain {chain + 1}, scrambler {numbers[0]} {one}."
                    : $"Chain {chain + 1}, scramblers {Ranges(numbers)} {many}.");
            }
        }
    }

    /// <summary>Numbers in order as ranges: "1, 3, 5–7".</summary>
    private static string Ranges(int[] numbers)
    {
        var ranges = new List<string>();
        for (var start = 0; start < numbers.Length;)
        {
            var end = start;
            while (end + 1 < numbers.Length && numbers[end + 1] == numbers[end] + 1)
            {
                end++;
            }

            ranges.Add(end > start ? $"{numbers[start]}–{numbers[end]}" : $"{numbers[start]}");
            start = end + 1;
        }

        return string.Join(", ", ranges);
    }

    /// <summary>"Chain 1" or "Chains 1–2".</summary>
    public static string ChainNames(IReadOnlyList<int> chains)
    {
        ArgumentNullException.ThrowIfNull(chains);

        return chains.Count == 1 ? $"Chain {chains[0] + 1}" : $"Chains {chains[0] + 1}–{chains[^1] + 1}";
    }

    private static void CheckRow(int row)
    {
        if (row is < 0 or > 2)
        {
            throw new DomainException($"There is no row {row + 1}; a scrambler has three drums.");
        }
    }

    private void CheckJoinedIn(int chain)
    {
        ChainAt(chain);
        if (chain > 0 && _joins[chain - 1])
        {
            throw new DomainException($"Chain {chain + 1} is joined to chain {chain}; use the test register of the first chain.");
        }
    }

    private ChainSetup ChainAt(int chain) =>
        chain is >= 0 and < Chains ? ChainSetups[chain] : throw new DomainException($"There is no chain {chain + 1}.");

    private ScramblerSetup ScramblerAt(int chain, int scrambler) =>
        scrambler is >= 0 and < ScramblersPerChain
            ? ChainAt(chain).Scramblers[scrambler]
            : throw new DomainException($"A chain has {ScramblersPerChain} scramblers; there is no scrambler {scrambler + 1}.");
}
