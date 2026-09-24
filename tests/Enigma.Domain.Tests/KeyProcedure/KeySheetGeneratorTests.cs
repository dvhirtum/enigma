using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class KeySheetGeneratorTests
{
    private static readonly RotorType[] NavyRotors = [RotorType.VI, RotorType.VII, RotorType.VIII];

    [Theory]
    [InlineData("M3", 1944, 6, 30)]
    [InlineData("M4", 1944, 7, 31)]
    public void Should_cover_every_day_of_the_month_When_a_sheet_is_generated(string model, int year, int month, int days)
    {
        // Arrange
        var random = new Random(7);

        // Act
        var sheet = KeySheetGenerator.Generate("id", MachineModel.FromName(model), "Triton", new KeyMonth(year, month), random);

        // Assert
        Assert.Equal(Enumerable.Range(1, days), sheet.DailyKeys.Select(k => k.Day));
        Assert.Equal(model, sheet.Model.Name);
        Assert.Equal(Provenance.Generated, sheet.Provenance);
    }

    [Fact]
    public void Should_change_the_inner_setting_every_other_day_When_a_sheet_is_generated()
    {
        // Arrange
        var random = new Random(11);

        // Act
        var sheet = KeySheetGenerator.Generate("id", MachineModel.M4, "Triton", new KeyMonth(1944, 7), random);

        // Assert
        foreach (var pair in sheet.DailyKeys.Chunk(2).Where(p => p.Length == 2))
        {
            Assert.Same(pair[0].Reflector, pair[1].Reflector);
            Assert.Equal(pair[0].Rotors, pair[1].Rotors);
            Assert.Equal(pair[0].Rings, pair[1].Rings);
            Assert.NotEqual(pair[0].Plugs, pair[1].Plugs);
        }
    }

    [Fact]
    public void Should_follow_Navy_rules_When_a_sheet_is_generated()
    {
        // Arrange
        var random = new Random(3);

        // Act
        var sheet = KeySheetGenerator.Generate("id", MachineModel.M3, "Hydra", new KeyMonth(1943, 12), random);

        // Assert
        Assert.All(sheet.DailyKeys, key =>
        {
            Assert.Contains(key.Rotors, NavyRotors.Contains);
            Assert.Equal(KeySheetGenerator.PlugPairs, key.Plugs.Count);
            Assert.Equal(KeySheetGenerator.KenngruppenPerDay, key.Kenngruppen.Count);
        });
        var kenngruppen = sheet.DailyKeys.SelectMany(k => k.Kenngruppen).ToList();
        Assert.Equal(kenngruppen.Count, kenngruppen.Distinct().Count());
    }

    [Fact]
    public void Should_put_a_Greek_rotor_first_and_fit_a_thin_reflector_When_an_M4_sheet_is_generated()
    {
        // Arrange
        var random = new Random(5);

        // Act
        var sheet = KeySheetGenerator.Generate("id", MachineModel.M4, "Triton", new KeyMonth(1944, 2), random);

        // Assert
        Assert.All(sheet.DailyKeys, key =>
        {
            Assert.True(key.Rotors[0].IsGreek);
            Assert.True(key.Reflector.IsThin);
            Assert.Contains(key.Rotors.Skip(1), NavyRotors.Contains);
        });
    }
}
