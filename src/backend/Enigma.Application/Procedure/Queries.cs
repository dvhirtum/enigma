namespace Enigma.Application.Procedure;

public sealed record GetKenngruppenbuch(string Id);

public sealed record GetTauschtafelSet(string Id);

public sealed class GetKenngruppenbuchHandler(KeySheetLinker linker)
{
    public KenngruppenbuchDocument Handle(GetKenngruppenbuch query)
    {
        ArgumentNullException.ThrowIfNull(query);

        return ProcedureMapper.ToDocument(linker.Book(query.Id));
    }
}

public sealed class GetTauschtafelSetHandler(KeySheetLinker linker)
{
    public TauschtafelSetDocument Handle(GetTauschtafelSet query)
    {
        ArgumentNullException.ThrowIfNull(query);

        return ProcedureMapper.ToDocument(linker.Tables(query.Id));
    }
}
