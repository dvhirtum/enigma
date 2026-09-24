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
   - **Teil B, Suchtafel**: the column number of every trigram, so the receiver can find out which network a Schlüsselkenngruppe belongs to. See "Using the Suchtafel" below.
3. **Doppelbuchstabentauschtafeln**: the calendar of which table applies to each half month (your month is marked), then the 9 tables. To swap a pair such as `SW`, find row `S`, column `W`: the cell holds its partner. The tables work both ways.

With the PDF and the machine, you can [send](sending-by-hand.md) and [receive](receiving-by-hand.md) by hand without the viewers in the panel.

### Using the Suchtafel

The sender picks a trigram from a column in the Spaltentafel. The receiver has the opposite problem. After decrypting the indicator, they hold a Schlüsselkenngruppe such as `OFP`, and must find out which network it belongs to, and so which key sheet to use. The trigrams in the Spaltentafel are shuffled, so searching 676 columns for `OFP` is not practical. The Suchtafel lists every trigram in alphabetical order, each with its column number.

It has 26 blocks, one for each first letter, titled `Kenngruppen A..` to `Kenngruppen Z..`. In each block:

- each row is labelled with the first **two** letters (`OA`, `OB`, … `OZ`),
- each column is headed with the **third** letter (`A` to `Z`),
- each cell holds the trigram's column number in the Spaltentafel.

**Example:** to look up `OFP`:

1. Go to the block `Kenngruppen O..`.
2. Go down to the row `OF`.
3. Go across to the column `P`. Suppose the cell reads `113` (your own book differs).

```
Kenngruppen O..
       A    B    C   ...   P   ...
OE   ...
OF   412   87  233   ...  113  ...
OG   ...
```

4. In the Zuteilungsliste, column 113 falls in the range allotted to a network, for example `Triton 101–120`. The message was sent in the Triton key, so use the Triton sheet for the day it was sent.

Check the Verfahrenkenngruppe the same way. Its column number must be 100 or lower, in the Verfahrenkenngruppen range. If not, the indicator was decrypted wrongly, perhaps with the wrong Tauschtafel.

## Sharing a sheet

To exchange messages with someone who has the application on another computer, **Export** a sheet and give them the file. They **Import** it. The file holds the daily keys, the Kenngruppenbuch and the Tauschtafeln, so both of you use the same key, Kenngruppen and bigram tables. Messages sent by one can then be received by the other, in operator mode or [by hand](receiving-by-hand.md).

Share further sheets the same way. When the Kenngruppenbuch is already there, importing adds the networks it lacks. The import is rejected if the file's Kenngruppenbuch or Tauschtafeln clash with the ones on the computer, for example when both sides gave the same columns to different networks. To avoid that, let one person create the sheets for everyone.
