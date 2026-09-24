# Sending by hand

[Back to the contents](README.md)

This page walks through the Navy procedure the way an operator worked it. It uses only the machine and the key sheet panel, not [operator mode](operator-mode.md). You need paper and a pencil to write down the lamps. If operator mode is running, click **Cancel** first, because it rejects keys it doesn't expect.

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

Open **Key sheets** and click **Apply** on the day. The machine gets the reflector, rotors, rings and plugs, with all rotors at A.

**Example:** click **New**, enter the network `Triton`, the month `1943-03` and this row, click **Save**, then **Apply** day 7:

```
7 B-thin Beta V VI VIII 13 02 20 05 AE BF CM DQ HU IN JX KR LS OY KDRW
```

This is an M4: reflector B-thin, rotors Beta V VI VIII, rings 13 02 20 05, ten plug pairs and the Grundstellung KDRW.

## 3. Choose the Kenngruppen

The sheet's **Kenngruppenbuch** viewer shows the Zuteilungsliste. Pick:

- a **Schlüsselkenngruppe** from a column allotted to your network. It tells the receiver which key to use.
- a **Verfahrenkenngruppe** from the Verfahrenkenngruppen columns. Choose any one, and a different one for each message.
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

Read the four vertical pairs: `SW`, `OJ`, `FM` and `PN`. Look up each pair in the **Tauschtafeln** viewer for the day. Each line such as `AB=CD` swaps AB and CD both ways, so look for the pair on either side of the `=`. Replace each pair with its partner.

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
