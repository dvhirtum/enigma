using Enigma.Domain.KeyProcedure;

namespace Enigma.Application.Procedure;

/// <summary>Stores generated Kenngruppenbücher.</summary>
public interface IKenngruppenbuchRepository
{
    IReadOnlyList<Kenngruppenbuch> List();

    /// <summary>The book with <paramref name="id" />, or null.</summary>
    Kenngruppenbuch? Find(string id);

    /// <summary>Adds or replaces a book.</summary>
    void Save(Kenngruppenbuch book);
}

/// <summary>Stores generated Tauschtafel sets.</summary>
public interface ITauschtafelSetRepository
{
    IReadOnlyList<TauschtafelSet> List();

    /// <summary>The set with <paramref name="id" />, or null.</summary>
    TauschtafelSet? Find(string id);

    void Save(TauschtafelSet tauschtafelSet);
}

/// <summary>Thrown when no Kenngruppenbuch or Tauschtafel set has the requested id.</summary>
public sealed class NotFoundException : Exception
{
    public NotFoundException()
    {
    }

    public NotFoundException(string message)
        : base(message)
    {
    }

    public NotFoundException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}

/// <summary>Stores generated Stichwort sets.</summary>
public interface IStichwortSetRepository
{
    IReadOnlyList<StichwortSet> List();

    /// <summary>The set with <paramref name="id" />, or null.</summary>
    StichwortSet? Find(string id);

    void Save(StichwortSet stichwortSet);
}

/// <summary>Stores generated weather short-signal tables.</summary>
public interface IWetterTafelSetRepository
{
    IReadOnlyList<WetterTafelSet> List();

    /// <summary>The set with <paramref name="id" />, or null.</summary>
    WetterTafelSet? Find(string id);

    void Save(WetterTafelSet wetterTafelSet);
}
