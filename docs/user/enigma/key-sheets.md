# Key sheets

[Back to The Enigma](README.md)

A key sheet (Schlüsseltafel) holds one month of daily keys for one network. Open the panel with the **Key sheets** button at the top right.

## Getting a sheet

- **Generate** creates a whole year for a model: one sheet per month for each network of the Kenngruppenbuch (Aegir, Hydra, Medusa, Neptun, Niobe, Sleipnir, Süd, Thetis, Tibet and Triton). The rotor order, reflector and rings change every other day; the plugs (10 pairs) and the Grundstellung change daily. A year can be generated once per model; delete its generated sheets to generate it again.
- **Import** reads a key sheet file (JSON), such as one saved with **Export**. To make your own sheet, edit an exported file and import it.

Each sheet is linked to a Kenngruppenbuch and a set of Tauschtafeln, which the [operator's notebook](operator-mode.md) uses. A network gets its own columns in the Kenngruppenbuch the first time it is used.

## The networks

The Kriegsmarine split its radio traffic into networks (Schlüsselkreise), each with its own key sheets, so a broken key exposed only part of it. Bletchley Park gave most of them a British name.

| Network | Used by | British name |
|---|---|---|
| Aegir | Surface warships, auxiliary cruisers and supply ships overseas. Never broken. | |
| Hydra | Ships in home and coastal waters, the main naval network, first called Heimische Gewässer. Read from August 1941. | Dolphin |
| Medusa | U-boats in the Mediterranean from 1943. Broken soon after it started. | Turtle |
| Neptun | Battleships and heavy cruisers on fleet operations. Never broken. | Barracuda |
| Niobe | U-boats in northern waters (Norway and the Arctic) from 1944. Broken from September 1944. | Narwhal |
| Sleipnir | Torpedo firing training for U-boats in the Baltic. Never broken. | |
| Süd | Surface ships in the Mediterranean and the Black Sea. | Porpoise |
| Thetis | U-boat training exercises in the Baltic. Never broken. | |
| Tibet | Supply ships and U-boats in the Far East. Broken on and off from August 1943. | Sunfish |
| Triton | U-boats in the Atlantic and the Mediterranean, on the M4 from February 1942. Unreadable until December 1942. | Shark |

## Working with a sheet

Choose a **Month**, then a **Key sheet** of that month, to see its days. The month list holds only months with sheets, grouped by year with the newest year first and named like "June 1944"; it starts at the current month when that has sheets. The sheet list groups the month's sheets by machine (M3, M4), with historical sheets first.

- **Apply** sets up the machine with that day's key and all rotors at A. For a sheet of the other model the application asks first, as the machine is replaced. The applied day is marked; "Applied, since modified" means the setup has changed since. To set up the machine yourself instead, see [Setting up the machine by hand](#setting-up-the-machine-by-hand).
- **Export** saves the sheet as a file and **Delete** removes it. Historical sheets are read-only.
- **Print to PDF** saves the sheet, and optionally the Kenngruppenbuch and Tauschtafeln, as PDFs typed as on a period typewriter. See below.

## Setting up the machine by hand

Operators set up the machine from the key sheet themselves each day. You can do the same instead of clicking **Apply**. Take the day's row from the panel or the printed Schlüsseltafel, whose columns are:

| Column | Meaning | Example (M4) |
|---|---|---|
| Umkehrwalze | Reflector | B dünn (B-thin) |
| Walzenlage | Rotors, left to right; on the M4 the Greek rotor first | Beta V VI VIII |
| Ringstellung | Ring of each rotor, left to right, 01–26 | 13 02 20 05 |
| Steckerverbindungen | Plug pairs | AE BF CM DQ HU IN JX KR LS OY |
| Grundstellung | Start position for the indicator, one letter per rotor | KDRW |

Set up the machine in this order:

1. **Model.** If the sheet is for the other model, choose it under **Model** in the header. A row with four rotors and a thin reflector is for the M4, three rotors for the M3.
2. **Rotors out.** In the [open-lid view](machine.md#open-lid), click each rotor in the machine to put it back in the box. Rings can only be set outside the machine.
3. **Rings.** In the box, turn each rotor of the Walzenlage to its Ringstellung with the mouse wheel or Arrow Up/Down. The box shows the ring as a number and a letter: `13 (M)` is ring 13, the letter M. The Greek rotor has a ring too.
4. **Rotors in.** Click a rotor in the box, then its slot, from left to right. On the M4, Beta or Gamma goes in the Greek slot at the left.
5. **Reflector.** If the Umkehrwalze differs, click the spare reflector in the reflector box.
6. **Plugs.** In the [plugboard view](machine.md#plugboard), remove any cables not on the sheet and connect each pair.
7. **Check.** The header shows the model, reflector and rotors. The list below the plugboard shows the cables. The rings show in the open-lid view.

The rotor positions are not part of the setup: the [indicator procedure](sending-by-hand.md) turns them to the Grundstellung and then to the message key. The **Key** label in the header only follows keys set up with **Apply**. If you applied a key earlier, it now says "(modified)"; switching the model clears it.

## Printing a sheet

**Print to PDF** writes the sheet with German headings, as on the originals. With **Also print the Kenngruppenbuch and Tauschtafeln** ticked, it asks for a folder and writes two PDFs there:

- `<network>-<month>.pdf`, such as `Triton-1944-06.pdf`: the key sheet.
- `Kenngruppenbuch-Tauschtafeln-<year>.pdf` (about 40 A4 pages): the Kenngruppenbuch and the Tauschtafeln. They are the same for every network and month of the year, so one copy serves all your sheets.

If the folder already has files with these names, it asks before replacing them.

Untick the box when you already have the Kenngruppenbuch and Tauschtafeln; it then asks where to save the key sheet only. The documents hold:

1. **Schlüsseltafel**: the daily keys, with the last day at the top, as on the real sheets. Operators cut off and destroyed the days they had used.
2. **Kenngruppenbuch**: the Zuteilungsliste, then two parts:
   - **Teil A, Spaltentafel**: all 676 columns, in bands of 20. Each band is labelled with its use, so your network's columns are one band. Pick the Schlüsselkenngruppe there, and the Verfahrenkenngruppe from the bands for columns 1–100.
   - **Teil B, Suchtafel**: the column number of every trigram, so the receiver can find out which network a Schlüsselkenngruppe belongs to. See "Using the Suchtafel" below.
3. **Doppelbuchstabentauschtafeln**: the calendar of which table applies to each half month, then the 9 tables. To swap a pair such as `SW`, find row `S`, column `W`: the cell holds its partner. The tables work both ways.

To [send](sending-by-hand.md) or [receive](receiving-by-hand.md) by hand, you need the Kenngruppenbuch and the Tauschtafeln from these PDFs. The application does not show them on screen.

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

To exchange messages with someone who has the application on another computer, **Export** a sheet and give them the file (compact JSON, without whitespace). They **Import** it. The file holds the daily keys, the Kenngruppenbuch and the Tauschtafeln, so both of you use the same key, Kenngruppen and bigram tables. Messages sent by one can then be received by the other, in the operator's notebook or [by hand](receiving-by-hand.md).

Share further sheets the same way. When the Kenngruppenbuch is already there, importing adds the networks it lacks. The import is rejected if the file's Kenngruppenbuch or Tauschtafeln clash with the ones on the computer, for example when both sides gave the same columns to different networks. To avoid that, let one person create the sheets for everyone.
