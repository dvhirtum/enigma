# Key sheets

[Back to the contents](README.md)

A key sheet (Schlüsseltafel) holds one month of daily keys for one network. Open the panel with the **Key sheets** button at the top right.

## Getting a sheet

- **Generate** creates a full month for a model, network and month. The rotor order, reflector and rings change every other day; the plugs (10 pairs) and the Grundstellung change daily.
- **New** writes a sheet by hand, one row per day:

  ```
  1 B-thin Beta II IV I 01 01 01 22 AT BL DF GJ HM NW OP QY RZ VX QRSA
  ```

  The columns are: day, reflector, rotors (Greek rotor first on the M4), rings (01–26), plugs and Grundstellung (3 letters on the M3, 4 on the M4). An error names the line to fix.
- **Import** reads a key sheet file (JSON), such as one saved with **Export**.

Each sheet is linked to a Kenngruppenbuch and a set of Tauschtafeln, which [operator mode](operator-mode.md) uses. A network gets its own columns in the Kenngruppenbuch the first time it is used.

## Working with a sheet

Choose a sheet from the list to see its days.

- **Apply** sets up the machine with that day's key and all rotors at A. For a sheet of the other model the application asks first, as the machine is replaced. The applied day is marked; "Applied, since modified" means the setup has changed since.
- **Edit** changes the rows, **Export** saves the sheet as a file and **Delete** removes it. Historical sheets are read-only.
- **Kenngruppenbuch** shows the Zuteilungsliste (which columns belong to which network) and the columns.
- **Tauschtafeln** shows the bigram table in force on a chosen day. Each half month uses a different table.
- **Print to PDF** saves the sheet as a PDF, typed as on a period typewriter, for working the procedure on paper. See below.

## Printing a sheet

**Print to PDF** asks where to save the PDF (about 40 A4 pages) and writes it with German headings, as on the originals:

1. **Schlüsseltafel**: the daily keys, with the last day at the top, as on the real sheets. Operators cut off and destroyed the days they had used.
2. **Kenngruppenbuch**: the Zuteilungsliste, with your network marked `<===`, then two parts:
   - **Teil A, Spaltentafel**: all 676 columns, in bands of 20. Each band is labelled with its use, so your network's columns are one band. Pick the Schlüsselkenngruppe there, and the Verfahrenkenngruppe from the bands for columns 1–100.
   - **Teil B, Suchtafel**: the column of every trigram. Find the block of its first letter, the row of its first two letters and the column of its third. The receiver uses it to check which network a Schlüsselkenngruppe belongs to.
3. **Doppelbuchstabentauschtafeln**: the calendar of which table applies to each half month (your month is marked), then the 9 tables. To swap a pair such as `SW`, find row `S`, column `W`: the cell holds its partner. The tables work both ways.

With the PDF and the machine, you can [send](sending-by-hand.md) and [receive](receiving-by-hand.md) by hand without the viewers in the panel.

## Sharing a sheet

To exchange messages with someone who has the application on another computer, **Export** a sheet and give them the file. They **Import** it. The file holds the daily keys, the Kenngruppenbuch and the Tauschtafeln, so both of you use the same key, Kenngruppen and bigram tables. Messages sent by one can then be received by the other, in operator mode or [by hand](receiving-by-hand.md).

Share further sheets the same way. When the Kenngruppenbuch is already there, importing adds the networks it lacks. The import is rejected if the file's Kenngruppenbuch or Tauschtafeln clash with the ones on the computer, for example when both sides gave the same columns to different networks. To avoid that, let one person create the sheets for everyone.
