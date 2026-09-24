# Receiving by hand

[Back to the contents](README.md)

The receiver undoes the sender's steps in reverse. As on the [sending page](sending-by-hand.md), use the key sheet panel and the top-down view, with operator mode not running. The example receives the message from the sending page:

```
0915 = 60 = GEAQ LZBC IIYO GSLL WNVO EGSP CHZV PVOF RPJP ZRVD YQWS MOQX GJNC GEAQ LZBC
```

## 1. Check the message

- The first two groups and the last two groups must match. They are the indicator.
- Count every letter sent. The total must equal the count in the preamble. A different count means letters were lost or garbled in transmission.

**Example:** the indicator is `GEAQ LZBC`, and 15 groups of 4 make 60 letters.

## 2. Decrypt the indicator

Write the first group above the second:

```
G E A Q
L Z B C
```

Swap each vertical pair with the Tauschtafel for the day. The table works both ways, so the same lookup undoes the sender's swap.

**Example:** `GL`, `EZ`, `AB` and `QC` become `SW`, `OJ`, `FM` and `PN`:

```
S O F P
W J M N
```

Drop the filler at the front of the top row and at the end of the bottom row:

- the top row gives the Schlüsselkenngruppe, `OFP`.
- the bottom row gives the Verfahrenkenngruppe, `WJM`.

## 3. Find the key

The Schlüsselkenngruppe names the network, and so the key sheet. In the **Kenngruppenbuch** viewer, it appears in a column allotted to the network in the Zuteilungsliste. Use that sheet's key for the day the message was sent. The Verfahrenkenngruppe must come from the Verfahrenkenngruppen columns.

If you don't know which sheet to use, paste the message into operator mode and click **Find key**. It only lists the matching sheets and starts nothing until you choose one.

## 4. Find the Spruchschlüssel

Apply the daily key, turn the rotors to the Grundstellung, and type the Verfahrenkenngruppe. The three lamps are the Spruchschlüssel, just as for the sender.

**Example:** at `K D R W`, typing `W J M` lights `Y O K`.

## 5. Decrypt the message

Turn the rotors to the Spruchschlüssel (on the M4, the Greek rotor keeps its Grundstellung letter). Type the cipher text, without the indicator groups, and write down the lamps.

**Example:** at `K Y O K`, the cipher text gives:

```
ZWOZ ERST OERE RXKU RSNU LLNE UNNU LLXF AHRT ZWON ULLX
```

That reads "ZWO ZERSTOERER X KURS NULL NEUN NULL X FAHRT ZWO NULL", followed by the X that filled the last group.

## Exercises: real messages

The published texts of these messages don't include their indicators. For each one, the key row already holds the message's start position in the Grundstellung column. Create the sheet with **New**, **Apply** the day, turn the rotors to that position, and type the cipher text.

### Scharnhorst, 26 December 1943 (M3)

Sent by the battleship Scharnhorst on the day of the Battle of the North Cape. Network `Hydra` (any name works), month `1943-12`:

```
26 B III VI VIII 01 08 13 AN EZ HK IJ LR MQ OT PV SW UX UZV
```

Rotors at `U Z V`:

```
YKAE NZAP MSCH ZBFO CUVM RMDP YCOF HADZ IZME FXTH FLOL PZLF GGBO TGOX GRET DWTJ IQHL MXVJ WKZU ASTR
```

The plaintext starts `STEUEREJTANAFJORDJAN`: "steuere Tanafjord an" (head for the Tanafjord), with the name between Js.

### U-264, 19 November 1942 (M4)

Sent by U-264 under Kapitänleutnant Hartwig Looks. It was broken in 2006 by the M4 Project, a distributed computing effort. Network `Triton`, month `1942-11`:

```
19 B-thin Beta II IV I 01 01 01 22 AT BL DF GJ HM NW OP QY RZ VX VJNA
```

Rotors at `V J N A`:

```
NCZW VUSX PNYM INHZ XMQX SFWX WLKJ AHSH NMCO CCAK UQPM KCSM HKSE INJU SBLK IOSX CKUB HMLL
XCSJ USRR DVKO HULX WCCB GVLI YXEO AHXR HKKF VDRE WEZL XOBA FGYU JQUK GRTV UKAM EURB VEKS
UHHV OYHA BCJW MAKL FKLM YFVN RIZR VVRT KOFD ANJM OLBG FFLE OPRG TFLV RHOW OPBE KVWM UQFM
PWPA RMFH AGKX IIBG
```

The plaintext starts `VONVONJLOOKSJ`: "von von Looks", from Looks.
