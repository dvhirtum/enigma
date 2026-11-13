using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>Generates the Offizier and Stab keys that go with a key sheet.</summary>
public static class OfficerKeyGenerator
{
    /// <summary>The day's reflector, Walzenlage and rings, with private plugs that change every two days.</summary>
    public static OfficerKey Offizier(KeySheet sheet, Random random)
    {
        ArgumentNullException.ThrowIfNull(sheet);
        ArgumentNullException.ThrowIfNull(random);

        var plugs = new Dictionary<int, PlugPair[]>();
        var days = sheet.DailyKeys.Select(key =>
        {
            var first = key.Day - (key.Day - 1) % 2;
            if (!plugs.TryGetValue(first, out var pairs)) plugs[first] = pairs = KeySheetGenerator.Plugs(random);

            return new DailyKey(key.Day, key.Reflector, key.Rotors, key.Rings, pairs);
        }).ToList();
        return new OfficerKey(days, SettingList.Generate(sheet.Model.Slots.Count, random));
    }

    /// <summary>Its own reflector, Walzenlage and rings every three days, and its own plugs daily.</summary>
    public static OfficerKey Stab(KeySheet sheet, Random random)
    {
        ArgumentNullException.ThrowIfNull(sheet);
        ArgumentNullException.ThrowIfNull(random);

        var inner = new Dictionary<int, (ReflectorType, RotorType[], RingSetting[])>();
        var days = sheet.DailyKeys.Select(key =>
        {
            var first = key.Day - (key.Day - 1) % 3;
            if (!inner.TryGetValue(first, out var setting))
                inner[first] = setting = KeySheetGenerator.InnerSetting(sheet.Model, random);

            var (reflector, rotors, rings) = setting;
            return new DailyKey(key.Day, reflector, rotors, rings, KeySheetGenerator.Plugs(random));
        }).ToList();
        return new OfficerKey(days, SettingList.Generate(sheet.Model.Slots.Count, random));
    }
}
