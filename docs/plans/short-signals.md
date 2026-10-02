# Plan: breaking Shark through weather short signals

Break a day's U-boat traffic the way Hut 8 did from December 1942: weather short signals (WWs) were sent with the Greek wheel at A, so the three-wheel Bombe can break them. The key then reads the WWs and, after finding the Greek wheel, the day's ordinary four-wheel messages. Source: Mahon, *The History of Hut Eight*, pages 062–086 (Shark, short signals).

Epic branch `feature/short-signals`; one PR per part into it, then one `feat:` squash into `main`.

## Weather short signals

- **Book.** The Wetterkurzschlüssel, 2nd edition (in force 20.1.42–10.3.43), used for every date. Nine tables, in this order: latitude, longitude, general area and pressure change, air pressure (2 mb), air temperature, wind direction and strength, present weather and clouds, visibility, swell. Mahon gives the order, the full swell table and the alphabetical rule (−13 °C = M, +14 °C = N). The other tables are reconstructed in the same style; the guide says which are historical.
- **Message.** 9 reading letters plus a 2-letter signature (11 letters). Sent as `WW`, time of origin, then 4-letter groups whose first letter is the single-letter indicator. The signature is two random letters and is never cribbed.
- **Settings.** A setting table per issue: 4 six-hour periods × 26 indicator letters → message setting (window letters). Generated with each key sheet year, printed and exported with the Kenngruppenbuch and Tauschtafeln. 1942–43 tables carry the historical names and periods (Weimar to 25.10.42, Eisenach to 11.1.43, Naumburg to 10.3.43).
- **Machines.** M3 and M4 key sheets. On the M4 the Greek wheel stands at A (ring A).

## Enigma mode: the operator's notebook

- **Send a weather short signal.** Enter or roll the readings, look up each letter in the book by hand (checked, with a fill-in button), take the setting from the table by indicator letter and time, type on the machine.
- **Receive a weather short signal.** Setting from the table, type the cipher text, look up each letter's reading in the book (fill-in button).

## Bombe mode: a second Hut 8 notebook route

The notebook offers two routes: "Break a message" (today) and "Break Shark via weather signals". Views are shared where they fit.

1. **Choose the day.** An exercise: a random day of a random key sheet (M3 or M4) with WWs added (from about 3, up to a cap) until the combined menu has at least 2 loops (deliberately helpful, not historical), plus 3–5 ordinary messages. Or paste your own WWs, optionally with ordinary messages, and pick the key sheet day; ordinary messages are generated on that day when none are pasted.
2. **The pinch.** The WW book and the day's setting table.
3. **Encode the weather reports.** For each WW, the Met Section's decode of the rebroadcast synoptic gives the readings; the user encodes them into the 9 crib letters with the book (checked, fill-in button).
4. **Draw the menu.** Links from all WWs at once. Every letter's window position is known from its setting and the rotor notches, so the relative core positions are exact (rings cancel, no middle-rotor problem). Each link gets a full three-drum start offset. Auto-build or by hand, with loops and measured stops.
5. **Run the Bombe.** As today.
6. **Choose a stop.** As today.
7. **Check the stop.** As today; all WW cribs must agree. The stecker sheet holds the pairs the menu reaches.
8. **Read the WWs.** Rings = cores − window settings (all three). Decrypt each WW and read the letters back into readings.
9. **Read the day's Shark.** On the first ordinary message: find the Greek wheel's letter (M4 only) by hand or with Find (scores the 26 positions; unknown letters assumed unsteckered), complete the Stecker with Suggest or by hand, then decode the other messages' indicators and read them on the Enigma, as in today's step 9.

## Domain changes

- Menu links from several cribs, each with a three-drum `DrumPosition` offset instead of a single offset.
- Window positions of every letter from a setting, including the double step.
- WW book tables, setting table generation, WW exercise generator with the loop gate.
- Greek wheel Find.

## User guide

- Weather short signals: the book, the setting tables, sending and receiving, which tables are reconstructed.
- The Shark route in the Bombe section, with the history: the M4 blackout, U-559, Archery, short-signal menus.
- Documented only, not built: Offizier keys, Stichwort, Stab, the four-wheel Bombe.
