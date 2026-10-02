using Enigma.Domain.Bombe;
using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class InterceptsTests
{
    public static TheoryData<string> Ids => [.. Intercepts.All.Select(intercept => intercept.Id)];

    [Theory]
    [MemberData(nameof(Ids))]
    public void Should_decrypt_to_the_published_plain_text_When_the_published_key_is_used(string id)
    {
        // Arrange
        var source = Intercepts.Find(id)!.Source;

        // Act
        var plaintext = source.Solution!.Decrypt(source.CipherText);

        // Assert
        Assert.Equal(source.Solution.Plaintext, plaintext);
    }

    [Theory]
    [MemberData(nameof(Ids))]
    public void Should_have_the_crib_in_the_plain_text_When_an_intercept_is_bundled(string id)
    {
        // Arrange
        var source = Intercepts.Find(id)!.Source;

        // Act
        var plaintext = source.Solution!.Plaintext;

        // Assert
        Assert.Contains(source.Crib!.ToString(), plaintext, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("barbarossa-1941-1", "WXC", "BLA", "KCH")]
    [InlineData("barbarossa-1941-2", "CRS", "LSD", "YPJ")]
    public void Should_send_the_message_key_as_in_the_preamble_When_it_is_encrypted_at_the_indicator_setting(
        string id, string setting, string messageKey, string sent)
    {
        // Arrange
        var solution = Intercepts.Find(id)!.Source.Solution! with { MessageKey = RotorPositions.Parse(setting) };

        // Act
        var encrypted = solution.Decrypt(Letters(messageKey));

        // Assert
        Assert.Equal(messageKey, solution.Decrypt(Letters(sent)));
        Assert.Equal(sent, encrypted);
        Assert.Contains($"{setting} {sent}", Intercepts.Find(id)!.Source.Transcript, StringComparison.Ordinal);
    }

    [Fact]
    public void Should_read_the_indicator_groups_When_the_Scharnhorst_message_is_bundled()
    {
        // Arrange
        // Act
        var source = Intercepts.Find("scharnhorst-1943")!.Source;

        // Assert
        Assert.Equal(new IndicatorGroups("UTKZ", "RBSB"), source.Message?.Indicator);
        Assert.Equal(80, source.CipherText.Count);
        Assert.Equal("YKAE", string.Concat(source.CipherText.Take(4)));
    }

    [Fact]
    public void Should_read_the_same_message_When_the_Red_Form_transcript_is_pasted()
    {
        // Arrange
        var source = Intercepts.Find("scharnhorst-1943")!.Source;

        // Act
        var pasted = MessageSource.Pasted(source.Transcript);

        // Assert
        Assert.StartsWith("1925 21\n", source.Transcript, StringComparison.Ordinal);
        Assert.Equal(source.CipherText, pasted.CipherText);
        Assert.Equal(source.Message?.Indicator, pasted.Message?.Indicator);
        Assert.Equal(21, pasted.Message?.StatedLetterCount);
    }

    [Fact]
    public void Should_return_null_When_no_intercept_has_the_id()
    {
        // Arrange
        // Act
        var intercept = Intercepts.Find("u-110");

        // Assert
        Assert.Null(intercept);
    }

    private static IReadOnlyList<Letter> Letters(string text) => [.. text.Select(Letter.FromChar)];

    [Theory]
    [MemberData(nameof(Ids))]
    public void Should_give_three_wheel_orders_with_the_key_When_an_intercept_is_bundled(string id)
    {
        // Arrange
        var source = Intercepts.Find(id)!.Source;

        // Act
        var hint = source.WheelOrders!;

        // Assert
        Assert.Equal(3, hint.Distinct().Count());
        Assert.Contains(source.Solution!.WheelOrder, hint);
    }

    [Theory]
    [InlineData("barbarossa-1941-1")]
    [InlineData("barbarossa-1941-2")]
    public void Should_give_wheel_orders_of_rotors_I_to_V_When_the_intercept_is_Army_traffic(string id)
    {
        // Arrange
        RotorType[] army = [RotorType.I, RotorType.II, RotorType.III, RotorType.IV, RotorType.V];

        // Act
        var hint = Intercepts.Find(id)!.Source.WheelOrders!;

        // Assert
        Assert.All(hint, order => Assert.Subset(army.ToHashSet(), new HashSet<RotorType> { order.Left, order.Middle, order.Right }));
    }
}
