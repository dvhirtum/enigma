# Officer keys and the Stichwort

[Back to The Enigma](README.md)

Besides the daily key, the Kriegsmarine used special keys for messages its radio operators were not to read, and the Stichwort to change a key that might be compromised. The application prints these keys and the Stichwort envelopes with each key sheet, so you can use them by hand (see [Trying it by hand](#trying-it-by-hand)). The source is Patrick Mahon, *The History of Hut Eight* (1945).

## Offizier

An Offizier message carried confidential or operational information for a captain or a senior shore authority. It was encrypted twice:

1. The officer encrypted the message on the officer key.
2. The radio operator encrypted the result again on the daily key, as an ordinary message with the [indicator procedure](sending-by-hand.md). The text started with OFFIZIER and the name of the officer's setting, such as OFFIZIER BRUNO.

The receiving operator decrypted the message as usual. The text after OFFIZIER BRUNO was still cipher text, so the operator handed the machine to an officer, who decrypted it on the officer key.

The officer key differed from the daily key:

- **Wheel order.** The same as the daily key.
- **Settings.** A list of 26 settings, one for each letter, valid for the whole month. There was no Grundstellung and no indicator: the officer chose a letter, turned the rotors to its setting and named it in the text, spelled out, as in Bruno for B or Paula for P.
- **Plugs.** Most networks gave the officers their own plugs (Stecker). They usually changed every two days; for the U-boats from August 1943, every ten days. A few networks kept the daily plugs and had only the private settings.

### How Hut 8 read it

Hut 8 first broke Offizier in late October 1941. When a day's key had been broken, its Offizier messages stayed unread after OFFIZIER.

- **Networks with the daily plugs.** The wheel order and plugs were known, so only the setting was missing. Short cribs broke messages by hand, and the American Hypo, a photographic machine, tried a message at every rotor position and scored each decrypt by its letters. The settings had a weakness: each letter appeared once only in each place of the 26 settings. Every setting found ruled out others, and late in the month a few hundred trials were left.
- **Networks with their own plugs.** The first break needed the Bombe and a crib, and cribs were scarce: the addresses were in the outer text, and officers sent few routine messages. A classic crib was FORT (continued) and the time of origin of the first part of a message, run at every place early in the second part where it did not crash: often about 100 menus. One month of Oyster was broken on a 16-letter message sent just after the last attack on the Tirpitz, cribbed as TIRPITZ GEKENTERT (Tirpitz capsized).
- **The rest of the month.** One break gave the plugs for two days and one setting. On a later pair of days, a message on a known setting gave the new plugs by hand: a Dottery decrypted it with every letter unplugged and looked for the letters that read like German.

Oyster and Limpet were read regularly. From about the middle of a busy month, Hut 8 could read nearly all new messages at once.

## Stab

Stab (staff) keys were a higher grade than Offizier. A message was encrypted twice in the same way, with a similar list of settings, but the Stab key had its own wheel order and rings, changed every three days, and its own plugs, changed daily. There was little traffic: perhaps 40 messages on all networks in 1944. Hut 8 broke Dolphin Stab once, in August 1944, from a re-encodement.

## Sonderschlüssel

From November 1944, single U-boats, and later fortresses and flotillas, had a special key of their own, the Sonderschlüssel, identified by a number. Its wheel order, rings and plugs were unrelated to the daily key and its Offizier. Its 26 settings never changed, and the wheel order and plugs changed three times a month, so the same key came back on the same ten days of every month. The US Navy broke Sonder 161, for St Nazaire, in April 1945 from a re-encodement, and then read it fully. Most Sonders carried only a few messages.

## The Stichwort

The Stichwort (keyword) was an emergency procedure, used when a key was thought to be compromised. Every holder of the machine kept a sealed envelope with a name such as PERSEUS. On the order STICHWORTBEFEHL PERSEUS, everyone opened it and changed the printed key sheet with the word inside. The earliest one Hut 8 knew of was DANZIG:

| Letter | Changes | Example |
|---|---|---|
| D (4) | adds 4 to each rotor number | I becomes V, VI becomes II |
| A, N, Z | add A, N and Z to the left, middle and right rings | |
| I | Mahon: adds 1 to the plug pairs. The application adds I (9) to each plug letter. | AB becomes JK |
| G | none: a dummy letter | |

The procedure itself was taught by word of mouth only, so a captured key sheet and envelope were not enough. Hut 8 had to break each Stichwort as a new key, but it rarely held them up for long.

The U-boats first used a Stichwort on 28 December 1941; it took 48 hours to break. From then on, Shark (Triton) always had a Stichwort in force, changed about every fortnight by the end of 1943:

- **Andromeda** with a number up to 24 took the trigram at that number in column 412 of the Kenngruppenbuch: its first letter changed the rotors, the second the rings, the third the plugs.
- **Bellatrix** with a four-figure number took the last three digits of the number's log-tangent in five-figure tables.
- **Castor**, on Niobe from 3 April 1945, used the moon tables of the Nautisches Jahrbuch and a cage of 34 squares.

When a station was about to be captured, the operators destroyed the key sheets and the Kenngruppenbuch, and made up a key from the inner settings of one day and the outer settings of another.

## Trying it by hand

The application has no Offizier or Stab setting on the machine and no Stichwort button, but every generated key sheet comes with the documents to do them by hand. In the key sheet panel, tick what you need under **Print to PDF** (see [Printing a sheet](key-sheets.md#printing-a-sheet)):

- **Also print the Offizier key**: `Offizier-<network>-<month>.pdf`. The day's reflector, Walzenlage and rings, private plugs that change every two days, and the month's 26 settings, named Anton to Zeppelin. Each letter appears once in each place of the settings, as on most real lists.
- **Also print the Stab key**: `Stab-<network>-<month>.pdf`. Its own reflector, Walzenlage and rings every three days, its own plugs every day, and 26 settings.
- **Also print the Stichwort envelopes**: `Stichwort-<year>.pdf`. The rule above, and eight envelopes for the year, such as PERSEUS with the word inside.

Mahon does not say which rings the Offizier key used; the application gives it the day's rings. Historical and imported sheets get Offizier and Stab keys the first time they are opened. An exported sheet holds them, so whoever imports it has the same keys.

### Sending an Offizier message

1. Set up the machine with the Offizier key of the day: the day's rotors and rings, and the Offizier plugs. See [Setting up the machine by hand](key-sheets.md#setting-up-the-machine-by-hand).
2. Choose a setting, such as B (Bruno), turn the rotors to it and type the message. Write down the lamps.
3. Set up the daily key, and [send](sending-by-hand.md) OFFIZIER BRUNO and the cipher text of step 2 as an ordinary message.

The receiver [receives it by hand](receiving-by-hand.md), reads OFFIZIER BRUNO, sets up the Offizier key at setting B and types the rest. A Stab message goes the same way, with the Stab key of the day.

### Putting a Stichwort in force

Choose an envelope, such as PERSEUS, and change the day's row of the key sheet with its word before you set up the machine. With DANZIG, Walzenlage VI I VIII becomes II V IV, Ringstellung 01 01 05 becomes 02 15 05 (A, N and Z added), and the plug pair AB becomes JK (I added). Both sides must put the same Stichwort in force.
