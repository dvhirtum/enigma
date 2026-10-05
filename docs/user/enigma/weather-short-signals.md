# Weather short signals

[Back to The Enigma](README.md)

From 1941, U-boats sent their weather observations as weather short signals (WW): nine letters coded from a book, the Wetterkurzschlüssel, and a two-letter signature. The message key came from a printed table instead of the indicator procedure. A short message meant a short transmission, so the boat was hard to find by direction-finding. In 1942 these signals let Bletchley Park break back into the M4; see [Breaking the M4](../bombe/breaking-the-m4.md).

The application prints the book and the year's setting tables, so you can send and receive weather short signals by hand. The operator's notebook does not do them. Tick **Also print the Wetterkurzschlüssel** under **Print to PDF** in the key sheet panel to get `Wetterkurzschluessel-<year>.pdf`.

## The book

The application follows the 2nd edition, in force from 20 January 1942 to 10 March 1943, and uses it for every year. Its nine tables each turn one observation into one letter. Mahon gives the order of the tables, the swell table (table 9) and the rule for the temperature (table 5); the other tables are reconstructed in the same style. The printout marks the historical tables with *.

| Letter | Table | Observation |
|---|---|---|
| 1 | 1 | Latitude in degrees north |
| 2 | 2 | Longitude in degrees west or east |
| 3 | 3 | General area, and whether the air pressure is rising, steady or falling |
| 4 | 4 | Air pressure, to 2 millibars |
| 5 | 5 | Air temperature in °C |
| 6 | 8 | Wind direction and force |
| 7 | 6 | Present weather and cloud |
| 8 | 7 | Visibility |
| 9 | 9 | Direction and kind of swell |
| 10–11 | | The boat's signature |

The letters are sent in this order, so letters 6, 7 and 8 come from tables 8, 6 and 7. Some U-boat operators never got this right.

Several tables use each letter for more than one value. Latitude and longitude repeat every 26 degrees, and the general area in table 3 tells which band is meant. In table 5, the letter is the temperature minus 1, counted round the alphabet: −13 °C and +13 °C are both M, +14 °C is N.

## The setting tables

The Spruchschlüsseltafel für Wetterkurzfunksprüche gives a three-letter setting for each indicator letter A–Z, in four columns for the hours 0000–0559, 0600–1159, 1200–1759 and 1800–2359. Each issue is named by a Kennwort. From 20 January 1942 to 9 March 1943, the tables follow the historical issues Weimar, Eisenach and Naumburg; otherwise a new table comes into force every quarter. An issue that runs into the next year is the same in both years' printouts.

On the M4, the Greek rotor stands at A for a weather short signal, so the setting has three letters on both models.

## Sending

**Example:** 47° N, 24° W, pressure 1004 mb and falling, +14 °C, wind south-west force 5, rain with 7/8 cloud, visibility 10 km, moderate swell from the west.

1. **Code the observations.** Look up each one in its table, in the order above: 47° is V (table 1), 24° is Y (table 2), the area 26–51° N, 0–25° W with falling pressure is W (table 3), 1004 mb is O, +14 °C is N, wind SW force 5 is N (table 8), rain with 7–8/8 cloud is U (table 6), 10 km is Q (table 7), and moderate swell from the west is O (table 9). Add a two-letter signature, such as KF: `VYWONNUQOKF`.
2. **Choose an indicator letter**, such as R.
3. **Find the setting.** In the issue in force on the day, take the column for the time of sending and the row of the indicator letter. At 1430 it is the 1200–1759 column.
4. **Set up the machine** with the day's key. See [Setting up the machine by hand](key-sheets.md#setting-up-the-machine-by-hand). Turn the rotors to the setting, and on the M4 the Greek rotor to A.
5. **Encrypt** the eleven letters and write down the lamps.
6. **Write the signal:** WW, the time, then groups of four letters with the indicator letter first: `WW 1430 R...` followed by the eleven cipher letters, three groups in all.

## Receiving

1. Read the indicator letter, the first letter after the time.
2. Take the setting from the table, by the day, the time and the indicator letter.
3. Set up the machine with the day's key, turn the rotors to the setting (the Greek rotor to A) and type the eleven letters after the indicator.
4. Look up each letter in its table, in the order above. The last two letters are the signature.
