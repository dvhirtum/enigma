import { useEffect, useState } from 'react';
import type { KeySheet } from '../api';
import { useMachine } from '../store';

/** The Zuteilungsliste and one column at a time. */
function BookView({ id }: { id: string }) {
  const book = useMachine((store) => store.books[id]);
  const loadBook = useMachine((store) => store.loadBook);
  const [column, setColumn] = useState(1);

  useEffect(() => {
    void loadBook(id);
  }, [loadBook, id, book]);

  if (!book) {
    return <p role="status">Opening the Kenngruppenbuch...</p>;
  }

  return (
    <section className="viewer" aria-label="Kenngruppenbuch">
      <h3>Zuteilungsliste</h3>
      <table className="viewer-table">
        <tbody>
          <tr>
            <th scope="row">Verfahrenkenngruppen</th>
            <td>
              {book.verfahrenkenngruppen.first}–{book.verfahrenkenngruppen.last}
            </td>
          </tr>
          {book.allotments.map((allotment) => (
            <tr key={allotment.network}>
              <th scope="row">{allotment.network}</th>
              <td>
                {allotment.first}–{allotment.last}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <label>
        Column
        <input type="number" min={1} max={book.columns.length} value={column} onChange={(event) => setColumn(Math.min(book.columns.length, Math.max(1, Number(event.target.value) || 1)))} />
      </label>
      <p className="viewer-grid" aria-label={`Column ${column}`}>
        {book.columns[column - 1]}
      </p>
    </section>
  );
}

/** The table in force on a day of the sheet, with its swaps. */
function TablesView({ id, sheet }: { id: string; sheet: KeySheet }) {
  const tables = useMachine((store) => store.tables[id]);
  const loadTables = useMachine((store) => store.loadTables);
  const [day, setDay] = useState(sheet.days[0]?.day ?? 1);

  useEffect(() => {
    void loadTables(id);
  }, [loadTables, id]);

  if (!tables) {
    return <p role="status">Opening the Tauschtafeln...</p>;
  }

  const month = Number(sheet.month.slice(5, 7));
  const number = tables.calendar[(month - 1) * 2 + (day <= 15 ? 0 : 1)];
  const table = tables.tables.find((t) => t.number === number);
  return (
    <section className="viewer" aria-label="Tauschtafeln">
      <label>
        Day
        <select value={day} onChange={(event) => setDay(Number(event.target.value))}>
          {sheet.days.map((dailyKey) => (
            <option key={dailyKey.day}>{dailyKey.day}</option>
          ))}
        </select>
      </label>
      <h3>
        Tauschtafel {number} ({tables.year})
      </h3>
      <p className="viewer-grid" aria-label={`Tauschtafel ${number}`}>
        {table?.swaps.map((swap) => `${swap.slice(0, 2)}=${swap.slice(2)}`).join(' ')}
      </p>
    </section>
  );
}

/** Read-only views of the Kenngruppenbuch and Tauschtafeln linked to a sheet. */
export function ProcedureViewer({ sheet }: { sheet: KeySheet }) {
  const [shown, setShown] = useState<'book' | 'tables' | null>(null);
  if (!sheet.kenngruppenbuchId || !sheet.tauschtafelSetId) {
    return null;
  }

  const toggle = (view: 'book' | 'tables') => setShown(shown === view ? null : view);
  return (
    <>
      <div className="sheet-actions">
        <button type="button" aria-pressed={shown === 'book'} onClick={() => toggle('book')}>
          Kenngruppenbuch
        </button>
        <button type="button" aria-pressed={shown === 'tables'} onClick={() => toggle('tables')}>
          Tauschtafeln
        </button>
      </div>
      {shown === 'book' && <BookView id={sheet.kenngruppenbuchId} />}
      {shown === 'tables' && <TablesView id={sheet.tauschtafelSetId} sheet={sheet} />}
    </>
  );
}
