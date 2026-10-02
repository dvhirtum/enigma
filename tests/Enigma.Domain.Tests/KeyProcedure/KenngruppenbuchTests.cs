using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class KenngruppenbuchTests
{
    [Fact]
    public void Should_hold_every_trigram_once_in_676_columns_of_26_When_a_book_is_generated()
    {
        // Arrange
        var random = new Random(4);

        // Act
        var book = Kenngruppenbuch.Generate("book", Procedures.Created, [], random);

        // Assert
        var trigrams = Enumerable.Range(1, Kenngruppenbuch.ColumnCount).SelectMany(book.Column).ToList();
        Assert.Equal(Kenngruppe.Count, trigrams.Count);
        Assert.Equal(Kenngruppe.Count, trigrams.Distinct().Count());
        Assert.All(Enumerable.Range(1, Kenngruppenbuch.ColumnCount), n => Assert.Equal(26, book.Column(n).Count));
    }

    [Fact]
    public void Should_allot_20_columns_after_the_Verfahrenkenngruppen_to_each_network_When_a_book_is_generated()
    {
        // Arrange
        string[] networks = ["Triton", "Hydra"];

        // Act
        var book = Procedures.Book(networks);

        // Assert
        Assert.Equal(networks, book.Allotments.Select(a => a.Network));
        Assert.Equal(new ColumnRange(101, 120), book.AllotmentOf("triton")!.Columns);
        Assert.Equal(new ColumnRange(121, 140), book.AllotmentOf("Hydra")!.Columns);
    }

    [Fact]
    public void Should_tell_the_kind_of_group_When_a_trigram_is_looked_up()
    {
        // Arrange
        var book = Procedures.Book("Triton", "Hydra");
        var schluessel = Procedures.FirstSchluesselkenngruppe(book, "Triton");
        var verfahren = Procedures.FirstVerfahrenkenngruppe(book);

        // Act
        var location = book.Locate(schluessel);

        // Assert
        Assert.Equal((101, 1), location);
        Assert.True(book.IsSchluesselkenngruppe("Triton", schluessel));
        Assert.False(book.IsSchluesselkenngruppe("Hydra", schluessel));
        Assert.False(book.IsVerfahrenkenngruppe(schluessel));
        Assert.True(book.IsVerfahrenkenngruppe(verfahren));
    }

    [Fact]
    public void Should_give_the_next_free_columns_When_a_network_is_allotted()
    {
        // Arrange
        var book = Procedures.Book("Triton");

        // Act
        book.Allot("Neptun");

        // Assert
        Assert.Equal(new ColumnRange(121, 140), book.AllotmentOf("Neptun")!.Columns);
    }

    [Fact]
    public void Should_reject_the_allotment_When_the_book_has_no_free_columns()
    {
        // Arrange
        var book = Procedures.Book([.. Enumerable.Range(1, 28).Select(n => $"Net {n}")]);

        // Act
        void Act()
        {
            book.Allot("Neptun");
        }

        // Assert
        Assert.False(book.HasFreeColumns);
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("The Kenngruppenbuch has no free columns.", exception.Message);
    }

    [Fact]
    public void Should_reject_the_book_When_a_trigram_appears_twice()
    {
        // Arrange
        var columns = Enumerable.Range(0, Kenngruppenbuch.ColumnCount)
            .Select(c => (IReadOnlyList<Kenngruppe>)
                [.. Enumerable.Range(0, 26).Select(r => Kenngruppe.FromIndex(c == 1 && r == 0 ? 0 : c * 26 + r))])
            .ToList();

        // Act
        void Act()
        {
            _ = new Kenngruppenbuch("book", Procedures.Created, columns, []);
        }

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("Trigram AAA appears more than once in the Kenngruppenbuch.", exception.Message);
    }

    [Fact]
    public void Should_add_the_allotments_it_lacks_When_a_copy_of_the_book_is_merged()
    {
        // Arrange
        var here = Procedures.Book("Triton");
        var copy = Procedures.Book("Triton", "Hydra");

        // Act
        var changed = here.Merge(copy);

        // Assert
        Assert.True(changed);
        Assert.Equal(["Triton", "Hydra"], here.Allotments.Select(a => a.Network));
        Assert.Equal(new ColumnRange(121, 140), here.AllotmentOf("Hydra")!.Columns);
    }

    [Fact]
    public void Should_report_no_change_When_the_copy_has_no_new_allotments()
    {
        // Arrange
        var here = Procedures.Book("Triton", "Hydra");
        var copy = Procedures.Book("TRITON");

        // Act
        var changed = here.Merge(copy);

        // Assert
        Assert.False(changed);
        Assert.Equal(2, here.Allotments.Count);
    }

    [Fact]
    public void Should_keep_the_book_unchanged_When_an_allotment_of_the_copy_clashes()
    {
        // Arrange
        var here = Procedures.Book("Triton", "Shark");
        var copy = Procedures.Book("Triton", "Hydra", "Medusa");

        // Act
        void Act()
        {
            here.Merge(copy);
        }

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal(
            "Network Hydra has columns 121–140 in the imported Kenngruppenbuch, but here Shark has columns 121–140.",
            exception.Message);
        Assert.Equal(["Triton", "Shark"], here.Allotments.Select(a => a.Network));
    }

    [Fact]
    public void Should_reject_the_copy_When_its_columns_differ()
    {
        // Arrange
        var here = Procedures.Book("Triton");
        var other = Kenngruppenbuch.Generate("book", Procedures.Created, ["Triton"], new Random(3));

        // Act
        void Act()
        {
            here.Merge(other);
        }

        // Assert
        var exception = Assert.Throws<DomainException>(Act);
        Assert.Equal("The Kenngruppenbuch book differs from the one with the same id here.", exception.Message);
    }
}
