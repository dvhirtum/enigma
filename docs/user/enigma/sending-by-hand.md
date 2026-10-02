# Sending by hand

[Back to The Enigma](README.md)

This page walks through the Navy procedure the way an operator worked it: with the machine and the printed documents only, not the [operator's notebook](operator-mode.md). You need:

- the **key sheet** (Schlüsseltafel) for your network and month,
- the **Kenngruppenbuch** and the **Tauschtafeln** for the year,
- paper and a pencil to write down the lamps.

Print them with **Print to PDF** in the key sheet panel, with **Also print the Kenngruppenbuch and Tauschtafeln** ticked (see [Printing a sheet](key-sheets.md#printing-a-sheet)).

If a message is in progress in the operator's notebook, click **Cancel** first, because it rejects keys it doesn't expect.

The worked example runs through every step with values you can check on your own machine.

## 1. Prepare the text

Before encrypting, the Navy wrote out the message in letters only. The historical messages on the [receiving page](receiving-by-hand.md) show how:

| Written | Meaning |
|---|---|
| `X` | Full stop, the end of a sentence |
| `Y` | A separator, like a comma |
| `ZWO`, `DREI`, `NULL` | Numbers spelled out, with ZWO for 2 so it can't be mistaken for DREI |
| `UE`, `AE`, `OE` | Ü, Ä and Ö |
| `J LOOKS J` | A proper name between two Js |

**Example:** "Zwei Zerstörer. Kurs 090, Fahrt 20" (two destroyers, course 090, speed 20 knots) becomes:

```
ZWOZERSTOERERXKURSNULLNEUNNULLXFAHRTZWONULL
```

That is 43 letters. Messages are sent in groups of 4, so add an X to fill the last group: 44 letters.

## 2. Set up the daily key

Find the day's row on the printed key sheet and set up the machine from it: reflector, rotors, rings and plugs. Follow [Setting up the machine by hand](key-sheets.md#setting-up-the-machine-by-hand). Note the Grundstellung; you need it in step 4.

**Example:** save this as `triton-1943-03.json`, click **Import** in the key sheet panel and choose the file, then print it to PDF with the Kenngruppenbuch and Tauschtafeln:

```json
{
  "network": "Triton",
  "month": "1943-03",
  "days": [
    { "day": 7, "reflector": "B-thin", "rotors": ["Beta", "V", "VI", "VIII"], "rings": [13, 2, 20, 5],
      "plugs": ["AE", "BF", "CM", "DQ", "HU", "IN", "JX", "KR", "LS", "OY"], "grundstellung": "KDRW" }
  ]
}
```

The key sheet has one row, day 7. It is for the M4: reflector B dünn (B-thin), Walzenlage Beta V VI VIII, Ringstellung 13 02 20 05, ten plug pairs and the Grundstellung KDRW. Set up the machine with it: rings `13 (M)` on Beta, `02 (B)` on V, `20 (T)` on VI and `05 (E)` on VIII.

## 3. Choose the Kenngruppen

Open the Kenngruppenbuch PDF. The Zuteilungsliste gives the columns of each network. In the Spaltentafel, pick:

- a **Schlüsselkenngruppe** from the band of columns allotted to your network. It tells the receiver which key to use.
- a **Verfahrenkenngruppe** from the Verfahrenkenngruppen bands (columns 1–100). Choose any one, and a different one for each message.
- two **filler letters**, chosen at random.

**Example:** Schlüsselkenngruppe `OFP`, Verfahrenkenngruppe `WJM`, fillers `S` and `N`. On your own sheet, pick trigrams from your own book instead.

## 4. Find the Spruchschlüssel

1. In the top-down view, turn the rotors to the Grundstellung.
2. Type the Verfahrenkenngruppe and write down the three lamps. That is the Spruchschlüssel.

On the M4, the Spruchschlüssel sets only the three right-hand rotors. The Greek rotor stays at its Grundstellung letter.

**Example:** at `K D R W`, typing `W J M` lights `Y O K`. The rotors for the message are `K Y O K`.

## 5. Encrypt the message

Turn the rotors to the Spruchschlüssel and type the prepared text. Write down each lamp. Don't turn the rotors in between.

**Example:** at `K Y O K`, the 44 letters give:

```
IIYO GSLL WNVO EGSP CHZV PVOF RPJP ZRVD YQWS MOQX GJNC
```

## 6. Build the indicator

Write the Schlüsselkenngruppe with a filler in front, above the Verfahrenkenngruppe with a filler behind:

```
S O F P
W J M N
```

Read the four vertical pairs: `SW`, `OJ`, `FM` and `PN`. In the Tauschtafeln PDF, the Tafelkalender gives the table for the day's half month. In that table, find the row of the pair's first letter and the column of its second: the cell holds its partner. Replace each pair with its partner.

**Example:** suppose the table swaps `SW=GL`, `OJ=EZ`, `FM=AB` and `PN=QC` (your own table will differ). The pairs become:

```
G E A Q
L Z B C
```

The top row is the first indicator group, `GEAQ`, and the bottom row is the second, `LZBC`.

## 7. Write the radio message

The message is the time of origin, the total letter count, the two indicator groups, the cipher text, and the indicator groups again. The count covers every letter sent, the indicator groups included.

**Example:** 44 letters of cipher text plus 4 × 4 indicator letters is 60. Sent at 09:15:

```
0915 = 60 = GEAQ LZBC IIYO GSLL WNVO EGSP CHZV PVOF RPJP ZRVD YQWS MOQX GJNC GEAQ LZBC
```

To receive it, continue with [Receiving by hand](receiving-by-hand.md).
