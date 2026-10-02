using System.Globalization;
using Enigma.Domain.Machine;

namespace Enigma.Domain.KeyProcedure;

/// <summary>The month a key sheet is valid for, written as yyyy-MM.</summary>
public readonly record struct KeyMonth
{
    public KeyMonth(int year, int month)
    {
        if (year is < 1 or > 9999 || month is < 1 or > 12)
            throw new DomainException($"{year:0000}-{month:00} is not a valid month.");

        Year = year;
        Month = month;
    }

    public int Year { get; }

    public int Month { get; }

    public int Days => DateTime.DaysInMonth(Year, Month);

    /// <summary>Parses a month such as "1944-06".</summary>
    public static KeyMonth Parse(string value)
    {
        return DateOnly.TryParseExact(value, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? new KeyMonth(date.Year, date.Month)
            : throw new DomainException($"'{value}' is not a month such as 1944-06.");
    }

    public override string ToString()
    {
        return $"{Year:0000}-{Month:00}";
    }
}
