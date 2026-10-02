using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class OperatorProcedureTests
{
    private static readonly DailyKey Key = Keys.Day(1, "B", "I II III", "01 01 01", "AT", "QRS");
    private static readonly Kenngruppenbuch Book = Procedures.Book("Triton", "Hydra");
    private static readonly OperatorContext Context = new("Triton", Key.Grundstellung!, Book, Procedures.MirrorTable());
    private static readonly Kenngruppe Schluessel = Procedures.FirstSchluesselkenngruppe(Book, "Triton");
    private static readonly Kenngruppe Verfahren = Procedures.FirstVerfahrenkenngruppe(Book);

    private static OperatorProcedure StartSending()
    {
        return OperatorProcedure.StartSending(Context, new TimeOnly(18, 40), Letter.FromChar('Q'),
            Letter.FromChar('X'));
    }

    /// <summary>Takes a procedure from its Grundstellung step to typing the message.</summary>
    private static void SetUpMessageKey(OperatorProcedure procedure, EnigmaMachine machine)
    {
        Procedures.Turn(machine, Key.Grundstellung!);
        procedure.Observe(machine);
        Procedures.Type(procedure, machine, Verfahren.ToString());
        Procedures.Turn(machine, procedure.MessageKey!.Spruchschluessel);
        procedure.Observe(machine);
    }

    private static RadioMessage Send(string plaintext)
    {
        var machine = Key.SetUp();
        var procedure = StartSending();
        procedure.ChooseGroups(Schluessel, Verfahren, Letter.FromChar('Q'), Letter.FromChar('X'));
        SetUpMessageKey(procedure, machine);
        Procedures.Type(procedure, machine, plaintext);
        procedure.Finish();
        return procedure.Message!;
    }

    [Fact]
    public void Should_encrypt_the_indicator_and_wait_for_the_Grundstellung_When_the_groups_are_chosen()
    {
        // Arrange
        var procedure = StartSending();

        // Act
        procedure.ChooseGroups(Schluessel, Verfahren, Letter.FromChar('K'), Letter.FromChar('M'));

        // Assert
        Assert.Equal(OperatorStep.SetGrundstellung, procedure.Step);
        Assert.Equal(
            new Indicator(Schluessel, Verfahren, Letter.FromChar('K'), Letter.FromChar('M')).Encrypt(Context.Table),
            procedure.IndicatorGroups);
    }

    [Fact]
    public void Should_reject_the_groups_When_the_Schluesselkenngruppe_belongs_to_another_network()
    {
        // Arrange
        var procedure = StartSending();
        var hydra = Procedures.FirstSchluesselkenngruppe(Book, "Hydra");

        // Act
        void Act()
        {
            procedure.ChooseGroups(hydra, Verfahren, Letter.FromChar('Q'), Letter.FromChar('X'));
        }

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal($"Schlüsselkenngruppe {hydra} is not allotted to Triton.", exception.Message);
        Assert.Equal(OperatorStep.ChooseGroups, procedure.Step);
    }

    [Fact]
    public void Should_take_the_lamps_as_Spruchschluessel_When_the_Verfahrenkenngruppe_is_typed_at_the_Grundstellung()
    {
        // Arrange
        var machine = Key.SetUp();
        var procedure = StartSending();
        procedure.ChooseGroups(Schluessel, Verfahren, Letter.FromChar('Q'), Letter.FromChar('X'));
        Procedures.Turn(machine, Key.Grundstellung!);
        procedure.Observe(machine);

        // Act
        var lamps = Procedures.Type(procedure, machine, Verfahren.ToString());

        // Assert
        Assert.Equal(OperatorStep.SetSpruchschluessel, procedure.Step);
        Assert.Equal(lamps, procedure.MessageKey!.Spruchschluessel.ToString());
        Assert.Equal(MessageKey.Derive(Key, Key.Grundstellung!, Verfahren).Spruchschluessel,
            procedure.MessageKey.Spruchschluessel);
    }

    [Fact]
    public void Should_reject_keys_When_they_are_not_expected()
    {
        // Arrange
        var machine = Key.SetUp();
        var procedure = StartSending();
        procedure.ChooseGroups(Schluessel, Verfahren, Letter.FromChar('Q'), Letter.FromChar('X'));
        var wrong = Verfahren.Letters[0].Shift(1);

        // Act
        var beforeGrundstellung = Record.Exception(() => procedure.CheckKey(Verfahren.Letters[0]));
        Procedures.Turn(machine, Key.Grundstellung!);
        procedure.Observe(machine);
        var wrongLetter = Record.Exception(() => procedure.CheckKey(wrong));

        // Assert
        Assert.Equal("Set the rotors to the Grundstellung QRS first.",
            Assert.IsType<DomainException>(beforeGrundstellung).Message);
        Assert.Equal($"Type {Verfahren.Letters[0]} next.", Assert.IsType<DomainException>(wrongLetter).Message);
    }

    [Fact]
    public void Should_go_back_to_the_Grundstellung_When_a_rotor_is_turned_while_typing_the_Verfahrenkenngruppe()
    {
        // Arrange
        var machine = Key.SetUp();
        var procedure = StartSending();
        procedure.ChooseGroups(Schluessel, Verfahren, Letter.FromChar('Q'), Letter.FromChar('X'));
        Procedures.Turn(machine, Key.Grundstellung!);
        procedure.Observe(machine);
        Procedures.Type(procedure, machine, Verfahren.ToString()[..1]);

        // Act
        machine.TurnRotor(RotorSlot.Left, RotorPosition.FromChar('A'));
        procedure.Observe(machine);

        // Assert
        Assert.Equal(OperatorStep.SetGrundstellung, procedure.Step);
        Assert.Empty(procedure.SpruchschluesselLamps);
    }

    [Fact]
    public void Should_ask_for_X_to_fill_the_last_group_When_the_message_is_finished_early()
    {
        // Arrange
        var machine = Key.SetUp();
        var procedure = StartSending();
        procedure.ChooseGroups(Schluessel, Verfahren, Letter.FromChar('Q'), Letter.FromChar('X'));
        SetUpMessageKey(procedure, machine);
        Procedures.Type(procedure, machine, "WETTER");

        // Act
        void Act()
        {
            procedure.Finish();
        }

        // Assert
        Assert.Equal(2, procedure.FillersNeeded);
        Assert.Equal("Type X 2 more time(s) to fill the last group.", Assert.Throws<DomainException>(Act).Message);
    }

    [Fact]
    public void Should_build_the_radio_message_When_sending_is_finished()
    {
        // Arrange
        var machine = Key.SetUp();
        var procedure = StartSending();
        procedure.ChooseGroups(Schluessel, Verfahren, Letter.FromChar('Q'), Letter.FromChar('X'));
        SetUpMessageKey(procedure, machine);
        var cipher = Procedures.Type(procedure, machine, "WETTERXX");

        // Act
        procedure.Finish();

        // Assert
        Assert.Equal(OperatorStep.Done, procedure.Step);
        var groups = procedure.IndicatorGroups!;
        Assert.Equal(
            $"1840 = 24 = {groups.First} {groups.Second} {cipher[..4]} {cipher[4..]} {groups.First} {groups.Second}",
            procedure.Message!.ToString());
    }

    [Fact]
    public void Should_decrypt_the_message_When_a_sent_message_is_received_with_the_same_key()
    {
        // Arrange
        var message = Send("VORBERICHTXX");
        var machine = Key.SetUp();
        var procedure = OperatorProcedure.StartReceiving(Context, RadioMessage.Parse(message.ToString()));
        SetUpMessageKey(procedure, machine);

        // Act
        var plaintext = Procedures.Type(procedure, machine, message.CipherText);

        // Assert
        Assert.Empty(procedure.Warnings);
        Assert.Equal(new Indicator(Schluessel, Verfahren, Letter.FromChar('Q'), Letter.FromChar('X')),
            procedure.Indicator);
        Assert.Equal("VORBERICHTXX", plaintext);
        Assert.Equal(OperatorStep.Done, procedure.Step);
    }

    [Fact]
    public void Should_highlight_the_next_cipher_letter_When_the_message_is_received()
    {
        // Arrange
        var message = Send("WETTERXX");
        var machine = Key.SetUp();
        var procedure = OperatorProcedure.StartReceiving(Context, message);
        SetUpMessageKey(procedure, machine);

        // Act
        Procedures.Type(procedure, machine, message.CipherText[..3]);

        // Assert
        Assert.Equal(Letter.FromChar(message.CipherText[3]), procedure.ExpectedKey);
    }

    [Fact]
    public void Should_warn_When_the_received_message_does_not_fit_the_key()
    {
        // Arrange
        var hydra = Procedures.FirstSchluesselkenngruppe(Book, "Hydra");
        var groups =
            new Indicator(hydra, Schluessel, Letter.FromChar('Q'), Letter.FromChar('X')).Encrypt(Context.Table);
        var text = $"1840 = 30 = {groups.First} {groups.Second} ABCD {groups.First} {groups.Second}";

        // Act
        var procedure = OperatorProcedure.StartReceiving(Context, RadioMessage.Parse(text));

        // Assert
        Assert.Equal(
            [
                "The preamble gives 30 letters, but the message has 20.",
                $"Schlüsselkenngruppe {hydra} is not allotted to Triton.",
                $"{Schluessel} is not a Verfahrenkenngruppe."
            ],
            procedure.Warnings);
    }
}
