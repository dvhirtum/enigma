using Enigma.Domain.KeyProcedure;

namespace Enigma.Application.KeySheets;

/// <summary>Stores key sheets. Historical sheets cannot be saved or deleted.</summary>
public interface IKeySheetRepository
{
    IReadOnlyList<KeySheet> List();

    /// <summary>The sheet with <paramref name="id"/>, or null.</summary>
    KeySheet? Find(string id);

    /// <summary>Adds or replaces a generated or user-defined sheet.</summary>
    void Save(KeySheet sheet);

    /// <summary>Stores the links of any sheet, historical ones included.</summary>
    void SaveLinks(KeySheet sheet);

    void Delete(string id);
}

/// <summary>Thrown when no key sheet has the requested id.</summary>
public sealed class KeySheetNotFoundException : Exception
{
    public KeySheetNotFoundException()
    {
    }

    public KeySheetNotFoundException(string message)
        : base(message)
    {
    }

    public KeySheetNotFoundException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
