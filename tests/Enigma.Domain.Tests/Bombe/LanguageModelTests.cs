using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class LanguageModelTests
{
    [Fact]
    public void Should_score_Navy_plain_text_above_random_letters_When_scoring_a_decrypt()
    {
        // Arrange
        var plain = Text("DREIGEHTLANGSAMABERSIQERVORWAERTSXEINSSIEBENNULLSEQSXUHR");
        var random = new Random(3);
        Letter?[] noise = [.. plain.Select(_ => (Letter?)Letter.FromIndex(random.Next(Letter.Count)))];

        // Act
        var plainScore = LanguageModel.Gain(plain);
        var noiseScore = LanguageModel.Gain(noise);

        // Assert
        Assert.NotNull(plainScore);
        Assert.NotNull(noiseScore);
        Assert.True(plainScore > 0);
        Assert.True(plainScore > noiseScore + 1);
    }

    [Fact]
    public void Should_prefer_the_Navy_spelling_When_CH_is_written_Q()
    {
        // Arrange
        var n = Letter.FromChar('N');
        var i = Letter.FromChar('I');

        // Act
        var q = LanguageModel.LogProbability(n, i, Letter.FromChar('Q'));
        var c = LanguageModel.LogProbability(n, i, Letter.FromChar('C'));

        // Assert
        Assert.True(q > c);
    }

    [Fact]
    public void Should_sum_only_three_known_letters_in_a_row_When_letters_are_unknown()
    {
        // Arrange
        var text = Text("EIN?DER?");

        // Act
        var score = LanguageModel.Gain(text);

        // Assert
        var ein = LanguageModel.LogProbability(Letter.FromChar('E'), Letter.FromChar('I'), Letter.FromChar('N'));
        var der = LanguageModel.LogProbability(Letter.FromChar('D'), Letter.FromChar('E'), Letter.FromChar('R'));
        Assert.NotNull(score);
        Assert.Equal(ein + der - (2 * LanguageModel.RandomLogProbability), score.Value, 1e-12);
    }

    [Fact]
    public void Should_give_no_gain_When_no_three_letters_in_a_row_are_known()
    {
        // Arrange
        var text = Text("EI?N");

        // Act
        var score = LanguageModel.Gain(text);

        // Assert
        Assert.Null(score);
    }

    [Fact]
    public void Should_name_the_German_source_When_asked()
    {
        // Arrange

        // Act
        var source = LanguageModel.GermanSource;

        // Assert
        Assert.Contains("Effi Briest", source, StringComparison.Ordinal);
        Assert.Contains("Project Gutenberg", source, StringComparison.Ordinal);
    }

    private static Letter?[] Text(string text) =>
        [.. text.Select(c => c == '?' ? (Letter?)null : Letter.FromChar(c))];
}
