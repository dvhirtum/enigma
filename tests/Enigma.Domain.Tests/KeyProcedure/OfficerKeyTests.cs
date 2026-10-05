using Enigma.Domain.KeyProcedure;
using Enigma.Domain.Machine;

namespace Enigma.Domain.Tests.KeyProcedure;

public sealed class OfficerKeyTests
{
    [Theory]
    [InlineData(3)]
    [InlineData(4)]
    public void Should_use_each_letter_once_in_each_place_When_a_setting_list_is_generated(int width)
    {
        // Arrange
        var random = new Random(2);

        // Act
        var list = SettingList.Generate(width, random);

        // Assert
        Assert.Equal(width, list.Width);
        for (var place = 0; place < width; place++)
            Assert.Equal(Letter.Count, list.Settings.Select(s => s.Positions[place]).Distinct().Count());
    }

    [Fact]
    public void Should_reject_the_list_When_it_has_fewer_than_26_settings()
    {
        // Arrange
        var settings = Enumerable.Repeat("ABC", 25).ToList();

        // Act
        var exception = Record.Exception(() => SettingList.Parse(settings));

        // Assert
        Assert.IsType<DomainException>(exception);
    }

    [Fact]
    public void Should_keep_the_day_s_inner_setting_and_change_the_plugs_every_two_days_When_an_Offizier_key_is_generated()
    {
        // Arrange
        var sheet = KeySheetGenerator.Generate("id", MachineModel.M4, "Triton", new KeyMonth(1943, 7), new Random(5));

        // Act
        var offizier = OfficerKeyGenerator.Offizier(sheet, new Random(6));

        // Assert
        Assert.Equal(4, offizier.Settings.Width);
        Assert.All(offizier.Days.Zip(sheet.DailyKeys), pair =>
        {
            Assert.Same(pair.Second.Reflector, pair.First.Reflector);
            Assert.Equal(pair.Second.Rotors, pair.First.Rotors);
            Assert.Equal(pair.Second.Rings, pair.First.Rings);
            Assert.NotEqual(pair.Second.Plugs, pair.First.Plugs);
            Assert.Null(pair.First.Grundstellung);
        });
        foreach (var pair in offizier.Days.Chunk(2).Where(p => p.Length == 2))
            Assert.Equal(pair[0].Plugs, pair[1].Plugs);

        Assert.NotEqual(offizier.Days[0].Plugs, offizier.Days[2].Plugs);
    }

    [Fact]
    public void Should_change_the_inner_setting_every_three_days_and_the_plugs_daily_When_a_Stab_key_is_generated()
    {
        // Arrange
        var sheet = KeySheetGenerator.Generate("id", MachineModel.M3, "Hydra", new KeyMonth(1944, 8), new Random(5));

        // Act
        var stab = OfficerKeyGenerator.Stab(sheet, new Random(6));

        // Assert
        Assert.Equal(Enumerable.Range(1, 31), stab.Days.Select(k => k.Day));
        foreach (var block in stab.Days.Chunk(3))
            Assert.All(block, key =>
            {
                Assert.Same(block[0].Reflector, key.Reflector);
                Assert.Equal(block[0].Rotors, key.Rotors);
                Assert.Equal(block[0].Rings, key.Rings);
            });

        Assert.All(stab.Days.Zip(stab.Days.Skip(1)), pair => Assert.NotEqual(pair.First.Plugs, pair.Second.Plugs));
        Assert.NotEqual(sheet.DailyKeys.Select(k => k.Rotors), stab.Days.Select(k => k.Rotors));
    }

    [Fact]
    public void Should_reject_the_key_When_an_officer_key_is_for_the_other_model()
    {
        // Arrange
        var sheet = new KeySheet("id", "Hydra", new KeyMonth(1944, 8), Provenance.Generated, [Keys.M3(1)]);
        var key = new OfficerKey([Keys.M4(1)], SettingList.Generate(4, new Random(1)));

        // Act
        var exception = Record.Exception(() => sheet.SetOfficerKeys(key, null));

        // Assert
        Assert.IsType<DomainException>(exception);
    }

    [Fact]
    public void Should_add_both_keys_once_When_missing_officer_keys_are_filled()
    {
        // Arrange
        var sheet = new KeySheet("id", "Hydra", new KeyMonth(1944, 8), Provenance.Generated, [Keys.M3(1), Keys.M3(2)]);

        // Act
        var first = sheet.FillMissingOfficerKeys(new Random(1));
        var offizier = sheet.Offizier;
        var second = sheet.FillMissingOfficerKeys(new Random(2));

        // Assert
        Assert.True(first);
        Assert.False(second);
        Assert.Same(offizier, sheet.Offizier);
        Assert.Equal([1, 2], sheet.Stab!.Days.Select(k => k.Day));
    }
}
