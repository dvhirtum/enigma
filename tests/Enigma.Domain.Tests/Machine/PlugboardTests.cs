using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.Machine;

public sealed class PlugboardTests
{
    [Fact]
    public void Should_swap_both_letters_When_pair_is_connected()
    {
        // Arrange
        var plugboard = new Plugboard();

        // Act
        plugboard.Connect(PlugPair.Parse("AT"));

        // Assert
        Assert.Equal(Letter.FromChar('T'), plugboard.Swap(Letter.FromChar('A')));
        Assert.Equal(Letter.FromChar('A'), plugboard.Swap(Letter.FromChar('T')));
        Assert.Equal(Letter.FromChar('B'), plugboard.Swap(Letter.FromChar('B')));
    }

    [Fact]
    public void Should_accept_13_pairs_When_every_letter_is_plugged()
    {
        // Arrange
        var plugboard = new Plugboard();

        // Act
        foreach (var pair in "AB CD EF GH IJ KL MN OP QR ST UV WX YZ".Split(' '))
        {
            plugboard.Connect(PlugPair.Parse(pair));
        }

        // Assert
        Assert.Equal(Plugboard.MaxPairs, plugboard.Pairs.Count);
    }

    [Fact]
    public void Should_reject_pair_When_letter_is_already_plugged()
    {
        // Arrange
        var plugboard = new Plugboard();
        plugboard.Connect(PlugPair.Parse("AB"));

        // Act
        void Act() => plugboard.Connect(PlugPair.Parse("BC"));

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_reject_pair_When_it_is_the_default_value()
    {
        // Arrange
        var plugboard = new Plugboard();

        // Act
        void Act() => plugboard.Connect(default);

        // Assert
        Assert.Throws<DomainException>(Act);
        Assert.Empty(plugboard.Pairs);
    }

    [Fact]
    public void Should_remove_cable_When_either_end_is_disconnected()
    {
        // Arrange
        var plugboard = new Plugboard();
        plugboard.Connect(PlugPair.Parse("AB"));

        // Act
        plugboard.Disconnect(Letter.FromChar('B'));

        // Assert
        Assert.Empty(plugboard.Pairs);
    }

    [Fact]
    public void Should_reject_disconnect_When_letter_is_not_plugged()
    {
        // Arrange
        var plugboard = new Plugboard();

        // Act
        void Act() => plugboard.Disconnect(Letter.A);

        // Assert
        Assert.Throws<DomainException>(Act);
    }

    [Fact]
    public void Should_order_letters_When_pair_is_created()
    {
        // Arrange
        var z = Letter.FromChar('Z');

        // Act
        var pair = PlugPair.Create(z, Letter.A);

        // Assert
        Assert.Equal("AZ", pair.ToString());
    }

    [Fact]
    public void Should_reject_pair_When_letters_are_equal()
    {
        // Arrange
        var a = Letter.A;

        // Act
        void Act() => PlugPair.Create(a, a);

        // Assert
        Assert.Throws<DomainException>(Act);
    }
}
