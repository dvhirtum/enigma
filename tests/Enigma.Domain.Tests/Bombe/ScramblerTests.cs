using Enigma.Domain.Bombe;
using Enigma.Domain.Machine;
using Enigma.Domain.Tests.Machine;

namespace Enigma.Domain.Tests.Bombe;

public sealed class ScramblerTests
{
    [Theory]
    [InlineData("I II III", "01 01 01", "AAA")]
    [InlineData("II V III", "26 26 26", "ULA")]
    [InlineData("VIII VI I", "05 17 22", "QDR")]
    public void Should_encipher_like_an_unsteckered_Enigma_When_set_to_its_core_positions(
        string rotors, string rings, string windows)
    {
        // Arrange
        const string text = "WETTERVORHERSAGE";
        var machine = MachineBuilder.Build(MachineModel.M3, "B", rotors, rings, "", windows);
        var expected = machine.Type(text);
        var scrambler = new Scrambler(WheelOrder.Parse(rotors), ReflectorType.B);
        var start = BombeKeys.CorePosition(rings, windows);

        // Act
        var enciphered = string.Concat(text.Select((letter, index) =>
            scrambler.Encipher(Letter.FromChar(letter), start.Advance(index + 1)).ToChar()));

        // Assert
        Assert.Equal(expected, enciphered);
    }

    [Fact]
    public void Should_swap_letters_in_pairs_without_fixed_points_When_set_to_any_position()
    {
        // Arrange
        var scrambler = new Scrambler(WheelOrder.Parse("IV I VII"), ReflectorType.C);
        var position = DrumPosition.Parse("KXQ");

        // Act
        var outputs = Enumerable.Range(0, Letter.Count)
            .Select(index => scrambler.Encipher(Letter.FromIndex(index), position))
            .ToArray();

        // Assert
        Assert.All(Enumerable.Range(0, Letter.Count), index =>
        {
            Assert.NotEqual(index, outputs[index].Index);
            Assert.Equal(index, outputs[outputs[index].Index].Index);
        });
    }

    [Fact]
    public void Should_reject_the_reflector_When_it_is_thin()
    {
        // Arrange
        // Act
        static object Act()
        {
            return new Scrambler(WheelOrder.Parse("I II III"), ReflectorType.BThin);
        }

        // Assert
        Assert.Throws<DomainException>(Act);
    }
}
