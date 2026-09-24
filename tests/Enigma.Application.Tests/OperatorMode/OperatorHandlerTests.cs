using Enigma.Application.KeySheets;
using Enigma.Application.Machine;
using Enigma.Application.OperatorMode;
using Enigma.Application.Procedure;
using Enigma.Application.Tests.KeySheets;
using Enigma.Application.Tests.Machine;
using Enigma.Application.Tests.Procedure;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Application.Tests.OperatorMode;

public sealed class OperatorHandlerTests
{
    private static readonly string[] Slots = ["Left", "Middle", "Right"];

    private readonly FakeKeySheetRepository _sheets = new(
        new KeySheet("t", "Triton", KeyMonth.Parse("1944-06"), Provenance.UserDefined, KeySheetText.Parse("1 B I II III 01 01 01 AT QRS\n2 B I II III 01 01 01 AT\n")));

    private readonly FakeMachineSessionStore _store = new();
    private readonly KeySheetLinker _linker;
    private readonly OperatorContexts _contexts;

    public OperatorHandlerTests()
    {
        _linker = Linking.For(_sheets);
        _contexts = new OperatorContexts(_store, _linker);
    }

    private MachineState Apply(int day) => new ApplyDailyKeyHandler(_linker, _store).Handle(new ApplyDailyKey("t", day));

    private MachineState StartSending() =>
        new StartSendingHandler(_store, _contexts, new Random(1), new FixedTimeProvider()).Handle(new StartSending());

    private (string Schluessel, string Verfahren) Groups()
    {
        var book = _linker.Book(_sheets.Sheets["t"].KenngruppenbuchId!);
        return (book.Column(book.AllotmentOf("Triton")!.Columns.First)[5].ToString(), book.Column(1)[7].ToString());
    }

    private MachineState Set(string positions)
    {
        MachineState state = null!;
        foreach (var (slot, position) in Slots.Zip(positions))
        {
            state = new TurnRotorHandler(_store).Handle(new TurnRotor(slot, position.ToString()));
        }

        return state;
    }

    private string Type(string keys)
    {
        var lamps = string.Empty;
        foreach (var key in keys)
        {
            lamps += new PressKeyHandler(_store).Handle(new PressKey(key.ToString())).LitLamp;
            new ReleaseKeyHandler(_store).Handle(new ReleaseKey());
        }

        return lamps;
    }

    /// <summary>Walks from the Grundstellung step to typing the message.</summary>
    private void SetUpMessageKey(string verfahren)
    {
        Set("QRS");
        var spruchschluessel = Type(verfahren);
        Set(spruchschluessel);
    }

    [Fact]
    public void Should_ask_for_the_groups_When_sending_starts()
    {
        // Arrange
        Apply(1);

        // Act
        var state = StartSending();

        // Assert
        var operatorState = state.Operator!;
        Assert.Equal("Send", operatorState.Direction);
        Assert.Equal("ChooseGroups", operatorState.Step);
        Assert.Equal("Triton", operatorState.Network);
        Assert.Equal("QRS", operatorState.Grundstellung);
        Assert.Equal(_sheets.Sheets["t"].KenngruppenbuchId, operatorState.KenngruppenbuchId);
        Assert.Equal(2, operatorState.Fillers.Length);
    }

    [Fact]
    public void Should_follow_the_machine_through_every_step_When_a_message_is_sent()
    {
        // Arrange
        Apply(1);
        StartSending();
        var (schluessel, verfahren) = Groups();

        // Act
        var chosen = new ChooseGroupsHandler(_store).Handle(new ChooseGroups(schluessel, verfahren, "QX"));
        var atGrundstellung = Set("QRS");
        var spruchschluessel = Type(verfahren);
        var afterVerfahren = new GetMachineStateHandler(_store).Handle(new GetMachineState());
        var atSpruchschluessel = Set(spruchschluessel);
        var cipher = Type("WETTERXX");
        var done = new FinishMessageHandler(_store).Handle(new FinishMessage());

        // Assert
        Assert.Equal("SetGrundstellung", chosen.Operator!.Step);
        Assert.Equal(4, chosen.Operator.Bigrams.Count);
        Assert.Equal("TypeVerfahrenkenngruppe", atGrundstellung.Operator!.Step);
        Assert.Equal("SetSpruchschluessel", afterVerfahren.Operator!.Step);
        Assert.Equal(spruchschluessel, afterVerfahren.Operator.Spruchschluessel);
        Assert.Equal("TypeMessage", atSpruchschluessel.Operator!.Step);
        Assert.Equal("Done", done.Operator!.Step);
        Assert.Equal(cipher, done.Operator.Pad);
        Assert.Equal($"1840 = 24 = {chosen.Operator.Indicator} {cipher[..4]} {cipher[4..]} {chosen.Operator.Indicator}", done.Operator.Message);
    }

    [Fact]
    public void Should_reject_the_key_and_leave_the_rotors_When_the_key_is_not_expected()
    {
        // Arrange
        Apply(1);
        StartSending();
        var (schluessel, verfahren) = Groups();
        new ChooseGroupsHandler(_store).Handle(new ChooseGroups(schluessel, verfahren, "QX"));
        Set("QRS");
        var wrong = verfahren[0] == 'A' ? "B" : "A";

        // Act
        void Act() => new PressKeyHandler(_store).Handle(new PressKey(wrong));

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal($"Type {verfahren[0]} next.", exception.Message);
        Assert.Equal("S", _store.Machine.GetRotor(RotorSlot.Right).Position.ToString());
        Assert.Null(_store.Machine.HeldKey);
    }

    [Fact]
    public void Should_decrypt_the_message_When_a_sent_message_is_received()
    {
        // Arrange
        Apply(1);
        StartSending();
        var (schluessel, verfahren) = Groups();
        new ChooseGroupsHandler(_store).Handle(new ChooseGroups(schluessel, verfahren, "QX"));
        SetUpMessageKey(verfahren);
        Type("FUNKSPRUCH");
        Type("XX");
        var message = new FinishMessageHandler(_store).Handle(new FinishMessage()).Operator!.Message!;
        new CreateMachineHandler(_store).Handle(new CreateMachine("M4"));

        // Act
        var received = new StartReceivingHandler(_store, new ApplyDailyKeyHandler(_linker, _store), _contexts)
            .Handle(new StartReceiving(message, "t", 1));
        SetUpMessageKey(received.Operator!.Verfahrenkenngruppe!);
        Type(received.Operator.CipherText!);
        var state = new GetMachineStateHandler(_store).Handle(new GetMachineState());

        // Assert
        Assert.Equal(new AppliedKeyState("t", "Triton", "1944-06", 1, false), received.AppliedKey);
        Assert.Equal(verfahren, received.Operator.Verfahrenkenngruppe);
        Assert.Equal(schluessel, received.Operator.Schluesselkenngruppe);
        Assert.Empty(received.Operator.Warnings);
        Assert.Equal("Done", state.Operator!.Step);
        Assert.Equal("FUNKSPRUCHXX", state.Operator.Pad);
    }

    [Fact]
    public void Should_keep_the_machine_as_it_is_When_a_message_is_received_with_the_applied_key()
    {
        // Arrange
        Apply(1);
        new ConnectPlugHandler(_store).Handle(new ConnectPlug("CD"));
        var machine = _store.Machine;
        var handler = new StartReceivingHandler(_store, new ApplyDailyKeyHandler(_linker, _store), _contexts);

        // Act
        var state = handler.Handle(new StartReceiving("QWER TZUI ABCD QWER TZUI"));

        // Assert
        Assert.Same(machine, _store.Machine);
        Assert.True(state.AppliedKey!.Modified);
        Assert.Equal("Receive", state.Operator!.Direction);
        Assert.Equal("SetGrundstellung", state.Operator.Step);
    }

    [Fact]
    public void Should_refuse_to_receive_with_the_applied_key_When_none_is_applied()
    {
        // Arrange
        var handler = new StartReceivingHandler(_store, new ApplyDailyKeyHandler(_linker, _store), _contexts);

        // Act
        void Act() => handler.Handle(new StartReceiving("QWER TZUI ABCD QWER TZUI"));

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("Apply a daily key first.", exception.Message);
    }

    [Fact]
    public void Should_end_the_procedure_When_a_daily_key_is_applied()
    {
        // Arrange
        Apply(1);
        StartSending();

        // Act
        var state = Apply(1);

        // Assert
        Assert.Null(state.Operator);
        Assert.Null(_store.Procedure);
    }

    [Fact]
    public void Should_end_the_procedure_When_it_is_cancelled()
    {
        // Arrange
        Apply(1);
        StartSending();

        // Act
        var state = new CancelOperatorHandler(_store).Handle(new CancelOperator());

        // Assert
        Assert.Null(state.Operator);
        Assert.NotNull(new PressKeyHandler(_store).Handle(new PressKey("A")).LitLamp);
    }

    [Fact]
    public void Should_refuse_to_start_When_no_daily_key_is_applied()
    {
        // Arrange
        // Act
        void Act() => StartSending();

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("Apply a daily key first.", exception.Message);
    }

    [Fact]
    public void Should_use_the_filled_in_Grundstellung_When_the_day_had_none()
    {
        // Arrange
        Apply(2);

        // Act
        var state = StartSending();

        // Assert
        var filled = _sheets.Sheets["t"].KeyFor(2).Grundstellung!.ToString();
        Assert.Equal(filled, state.Operator!.Grundstellung);
        Assert.Equal(3, filled.Length);
    }

    [Fact]
    public void Should_use_the_filled_in_Grundstellung_When_the_key_was_applied_before_the_sheet_was_filled()
    {
        // Arrange
        var key = _sheets.Sheets["t"].KeyFor(2);
        _store.Replace(key.SetUp(), new AppliedKey("t", "Triton", "1944-06", key));

        // Act
        var state = StartSending();

        // Assert
        Assert.Equal(_sheets.Sheets["t"].KeyFor(2).Grundstellung!.ToString(), state.Operator!.Grundstellung);
    }

    [Fact]
    public void Should_find_the_sheet_of_the_Schluesselkenngruppe_When_keys_for_a_received_message_are_looked_up()
    {
        // Arrange
        _sheets.Save(new KeySheet("h", "Hydra", KeyMonth.Parse("1944-06"), Provenance.UserDefined, KeySheetText.Parse("1 C II III IV 01 01 01 BX KLM\n")));
        _sheets.Save(new KeySheet("j", "Triton", KeyMonth.Parse("1944-07"), Provenance.UserDefined, KeySheetText.Parse("1 B I II III 01 01 01 AT QRS\n")));
        Apply(1);
        StartSending();
        var (schluessel, verfahren) = Groups();
        new ChooseGroupsHandler(_store).Handle(new ChooseGroups(schluessel, verfahren, "QX"));
        SetUpMessageKey(verfahren);
        Type("ABCD");
        var message = new FinishMessageHandler(_store).Handle(new FinishMessage()).Operator!.Message!;
        var handler = new FindReceivingKeysHandler(_linker);

        // Act
        var keys = handler.Handle(new FindReceivingKeys(message, "1944-06-01"));

        // Assert
        Assert.Equal(new ReceivingKey("t", "Triton", "1944-06", 1, "M3", schluessel), Assert.Single(keys));
    }

    [Fact]
    public void Should_reject_the_date_When_it_is_not_a_date()
    {
        // Arrange
        var handler = new FindReceivingKeysHandler(_linker);

        // Act
        void Act() => handler.Handle(new FindReceivingKeys("QWER TZUI ABCD QWER TZUI", "June"));

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("'June' is not a date such as 1944-06-19.", exception.Message);
    }
}
