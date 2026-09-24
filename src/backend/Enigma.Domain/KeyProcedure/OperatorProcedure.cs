using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

public enum OperatorDirection
{
    Send,
    Receive,
}

public enum OperatorStep
{
    ChooseGroups,
    SetGrundstellung,
    TypeVerfahrenkenngruppe,
    SetSpruchschluessel,
    TypeMessage,
    Done,
}

/// <summary>What the procedure needs from the applied daily key.</summary>
public sealed record OperatorContext(string Network, RotorPositions Grundstellung, Kenngruppenbuch Book, Doppelbuchstabentauschtafel Table);

/// <summary>
/// Walks an operator through sending or receiving a message with the Navy indicator procedure, while the operator
/// works the machine. Setting steps finish once the rotor windows show the setting.
/// </summary>
public sealed class OperatorProcedure
{
    private readonly List<Letter> _spruchschluesselLamps = [];
    private readonly List<Letter> _pad = [];
    private readonly List<string> _warnings = [];
    private RotorPositions? _afterLastKey;

    private OperatorProcedure(OperatorDirection direction, OperatorContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        Direction = direction;
        Context = context;
    }

    public OperatorDirection Direction { get; }

    public OperatorContext Context { get; }

    public OperatorStep Step { get; private set; }

    /// <summary>The indicator: chosen when sending, decrypted when receiving. Null until the groups are chosen.</summary>
    public Indicator? Indicator { get; private set; }

    public IndicatorGroups? IndicatorGroups { get; private set; }

    /// <summary>Filler letters drawn for the indicator before the groups are chosen.</summary>
    public (Letter Before, Letter After) Fillers { get; private set; }

    public TimeOnly? TimeOfOrigin { get; }

    /// <summary>The lamps lit so far while typing the Verfahrenkenngruppe.</summary>
    public IReadOnlyList<Letter> SpruchschluesselLamps => _spruchschluesselLamps;

    public MessageKey? MessageKey { get; private set; }

    /// <summary>The lamps lit while typing the message: cipher text when sending, plaintext when receiving.</summary>
    public IReadOnlyList<Letter> Pad => _pad;

    /// <summary>The message received, or the message to send once finished.</summary>
    public RadioMessage? Message { get; private set; }

    public IReadOnlyList<string> Warnings => _warnings;

    /// <summary>The key the operator must press next, or null when any key will do or none is expected.</summary>
    public Letter? ExpectedKey => Step switch
    {
        OperatorStep.TypeVerfahrenkenngruppe => Indicator!.Verfahrenkenngruppe.Letters[_spruchschluesselLamps.Count],
        OperatorStep.TypeMessage when Direction == OperatorDirection.Receive => Letter.FromChar(Message!.CipherText[_pad.Count]),
        _ => null,
    };

    /// <summary>X letters still needed to fill the last group of the cipher text when sending.</summary>
    public int FillersNeeded =>
        Direction == OperatorDirection.Send && Step == OperatorStep.TypeMessage && _pad.Count % RadioMessage.GroupLength != 0
            ? RadioMessage.GroupLength - (_pad.Count % RadioMessage.GroupLength)
            : 0;

    public static OperatorProcedure StartSending(OperatorContext context, TimeOnly timeOfOrigin, Letter fillerBefore, Letter fillerAfter) =>
        new(OperatorDirection.Send, context, timeOfOrigin) { Fillers = (fillerBefore, fillerAfter) };

    /// <summary>Decrypts the indicator of <paramref name="message"/> and warns about anything that does not fit the key.</summary>
    public static OperatorProcedure StartReceiving(OperatorContext context, RadioMessage message)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(message);

        var procedure = new OperatorProcedure(OperatorDirection.Receive, context)
        {
            Message = message,
            IndicatorGroups = message.Indicator,
            Indicator = Indicator.Decrypt(message.Indicator, context.Table),
            Step = OperatorStep.SetGrundstellung,
        };
        procedure.Fillers = (procedure.Indicator.FillerBefore, procedure.Indicator.FillerAfter);

        if (message.StatedLetterCount is { } stated && stated != message.LetterCount)
        {
            procedure._warnings.Add($"The preamble gives {stated} letters, but the message has {message.LetterCount}.");
        }

        if (!context.Book.IsSchluesselkenngruppe(context.Network, procedure.Indicator.Schluesselkenngruppe))
        {
            procedure._warnings.Add($"Schlüsselkenngruppe {procedure.Indicator.Schluesselkenngruppe} is not allotted to {context.Network}.");
        }

        if (!context.Book.IsVerfahrenkenngruppe(procedure.Indicator.Verfahrenkenngruppe))
        {
            procedure._warnings.Add($"{procedure.Indicator.Verfahrenkenngruppe} is not a Verfahrenkenngruppe.");
        }

        return procedure;
    }

    /// <summary>Chooses the groups and fillers of the indicator to send, and encrypts it with the table.</summary>
    public void ChooseGroups(Kenngruppe schluesselkenngruppe, Kenngruppe verfahrenkenngruppe, Letter fillerBefore, Letter fillerAfter)
    {
        if (Direction != OperatorDirection.Send || Step != OperatorStep.ChooseGroups)
        {
            throw new DomainException("The groups can only be chosen at the start of sending.");
        }

        if (!Context.Book.IsSchluesselkenngruppe(Context.Network, schluesselkenngruppe))
        {
            throw new DomainException($"Schlüsselkenngruppe {schluesselkenngruppe} is not allotted to {Context.Network}.");
        }

        if (!Context.Book.IsVerfahrenkenngruppe(verfahrenkenngruppe))
        {
            throw new DomainException($"{verfahrenkenngruppe} is not a Verfahrenkenngruppe.");
        }

        Indicator = new Indicator(schluesselkenngruppe, verfahrenkenngruppe, fillerBefore, fillerAfter);
        IndicatorGroups = Indicator.Encrypt(Context.Table);
        Fillers = (fillerBefore, fillerAfter);
        Step = OperatorStep.SetGrundstellung;
    }

    /// <summary>Follows a change to the machine other than a key press.</summary>
    public void Observe(EnigmaMachine machine)
    {
        ArgumentNullException.ThrowIfNull(machine);

        switch (Step)
        {
            case OperatorStep.SetGrundstellung when Context.Grundstellung.IsShownOn(machine):
                Step = OperatorStep.TypeVerfahrenkenngruppe;
                _afterLastKey = RotorPositions.ShownOn(machine);
                break;
            case OperatorStep.TypeVerfahrenkenngruppe when !Equals(RotorPositions.ShownOn(machine), _afterLastKey):
                _spruchschluesselLamps.Clear();
                Step = OperatorStep.SetGrundstellung;
                Observe(machine);
                break;
            case OperatorStep.SetSpruchschluessel when MessageKey!.Spruchschluessel.IsShownOn(machine):
                Step = OperatorStep.TypeMessage;
                break;
            default:
                break;
        }
    }

    /// <summary>Rejects a key press the current step does not expect.</summary>
    public void CheckKey(Letter key)
    {
        switch (Step)
        {
            case OperatorStep.TypeVerfahrenkenngruppe or OperatorStep.TypeMessage when ExpectedKey is { } expected && key != expected:
                throw new DomainException($"Type {expected} next.");
            case OperatorStep.TypeVerfahrenkenngruppe or OperatorStep.TypeMessage:
                return;
            case OperatorStep.ChooseGroups:
                throw new DomainException("Choose the groups first.");
            case OperatorStep.SetGrundstellung:
                throw new DomainException($"Set the rotors to the Grundstellung {Context.Grundstellung} first.");
            case OperatorStep.SetSpruchschluessel:
                throw new DomainException($"Set the rotors to the Spruchschlüssel {MessageKey!.Spruchschluessel} first.");
            default:
                throw new DomainException("The message is done.");
        }
    }

    /// <summary>Records the lamp lit by a key press that <see cref="CheckKey"/> accepted.</summary>
    public void Record(EnigmaMachine machine, Letter key, Letter lamp)
    {
        ArgumentNullException.ThrowIfNull(machine);

        CheckKey(key);
        if (Step == OperatorStep.TypeVerfahrenkenngruppe)
        {
            _spruchschluesselLamps.Add(lamp);
            _afterLastKey = RotorPositions.ShownOn(machine);
            if (_spruchschluesselLamps.Count == 3)
            {
                MessageKey = MessageKey.FromLamps(Context.Grundstellung, Indicator!.Verfahrenkenngruppe, _spruchschluesselLamps);
                Step = OperatorStep.SetSpruchschluessel;
                Observe(machine);
            }

            return;
        }

        _pad.Add(lamp);
        if (Direction == OperatorDirection.Receive && _pad.Count == Message!.CipherText.Length)
        {
            Step = OperatorStep.Done;
        }
    }

    /// <summary>Ends sending once the cipher text fills whole groups, and builds the radio message.</summary>
    public void Finish()
    {
        if (Direction != OperatorDirection.Send || Step != OperatorStep.TypeMessage)
        {
            throw new DomainException("Only a message being typed for sending can be finished.");
        }

        if (_pad.Count == 0)
        {
            throw new DomainException("Type the message first.");
        }

        if (FillersNeeded > 0)
        {
            throw new DomainException($"Type X {FillersNeeded} more time(s) to fill the last group.");
        }

        Message = RadioMessage.Create(TimeOfOrigin!.Value, IndicatorGroups!, string.Concat(_pad.Select(l => l.ToString())));
        Step = OperatorStep.Done;
    }

    private OperatorProcedure(OperatorDirection direction, OperatorContext context, TimeOnly timeOfOrigin)
        : this(direction, context) => TimeOfOrigin = timeOfOrigin;
}
