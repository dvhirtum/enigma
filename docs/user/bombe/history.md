# How the Bombe broke Enigma

[Back to The Bombe](README.md)

This page explains the ideas behind the [Bombe](using-the-bombe.md): where cribs came from, why loops and the diagonal board matter, what goes wrong when the middle rotor turns over, and how Banburismus saved Bombe time. [Breaking a message](breaking-a-message.md) puts them to work.

## From the bomba to the Bombe

The Polish Cipher Bureau broke the Army Enigma in the 1930s. Its bomba of 1938 relied on the Army's habit of sending each message key twice at the start of the message, and it stopped working when the Germans changed that procedure. In July 1939 the Poles gave their results to Britain and France.

At Bletchley Park, Alan Turing designed a machine that needed no help from the indicator: the Bombe tests a crib, a guessed piece of plain text, at every rotor position. The British Tabulating Machine Company at Letchworth built it, with Harold "Doc" Keen as its engineer. The first Bombe, Victory, came into service in March 1940. Gordon Welchman's diagonal board was added from August 1940.

About 210 Bombes were built in Britain. Women of the Royal Naval Service (the Wrens) ran them, at Bletchley Park and at out-stations such as Eastcote and Stanmore. From 1943 the US Navy built more than a hundred four-rotor Bombes of its own against the M4; see [Breaking the M4](breaking-the-m4.md). A team led by John Harper rebuilt a Turing-Welchman Bombe at Bletchley Park; it is on show at The National Museum of Computing.

## Cribs

A crib only works if it is right, letter for letter, and in the right place. Hut 8 found its cribs in the routine of the German Navy:

- **Stereotyped messages.** Weather forecasts started with WETTERVORHERSAGE, patrol boats reported KEINE BESONDEREN EREIGNISSE (nothing to report), and U-boats reported their positions in the same words each time. Operators often started their messages the same way day after day.
- **Re-encodements ("kisses").** A message sent in Enigma and also in a cipher Bletchley Park could already read, such as a weather or dockyard cipher, gave a crib of the whole message.
- **Gardening.** The RAF laid mines in chosen places, so that the German mine warnings named grid squares Hut 8 knew in advance.

The Enigma never encrypts a letter to itself, so a crib cannot stand where one of its letters sits under the same cipher letter: a crash. Sliding the crib along the cipher text rules out the positions with crashes. The messages in the simulator use the Navy's spelling and abbreviations; see the [glossary](../glossary.md#terms-in-the-messages).

## Menus and loops

Each crib letter and the cipher letter above it form a link: at that offset, the Enigma without its plugboard turns the stecker partner of one into the stecker partner of the other. A menu is the set of links drawn as a graph of letters. On the Bombe, each link is a scrambler (three drums standing for the three rotors) cabled between the two letters, set to its offset.

The Bombe does not try the 26 possible partners of the test register letter one by one. It puts current on one guess, and the scramblers spread it along the cables to every partner that guess implies. When the guess is wrong, the current usually spreads to every wire of the test register, and the Bombe moves on to the next position. When it does not, the Bombe stops: either the guess was right, or the wire left dead is the right partner. So one test covers all 26 guesses at once.

A chain of links without a loop always gives a consistent set of partners, so it rules nothing out. A loop (a closure) brings the current back to a letter it started from, and at a wrong position the partners fit only by chance, about once in 26. Each loop therefore cuts the false stops by about 26, so Hut 8 looked for cribs whose menus had loops. The menu summary in the notebook gives the stops a menu can be expected to give.

## Welchman's diagonal board

The plugboard swaps letters in pairs: if A is steckered to G, then G is steckered to A. Turing's Bombe did not use this. Gordon Welchman's diagonal board does: it cables wire G of letter A's cable to wire A of letter G's cable, for every pair of letters. A wrong guess then spreads much further, also through letters that are not on the menu, and the false stops fall sharply. Even a menu with few loops becomes usable. On Carter's weather crib, the menu the notebook builds gives about 3.5 stops a wheel order with the diagonal board, and over 700 without it.

## The middle rotor under the crib

The Bombe moves its drums like the right rotor of the Enigma only: the middle and left drums stand still while the scramblers stand for the letters of the crib. When the middle rotor of the Enigma turns over somewhere under the crib, the links after the turnover belong to another middle rotor position. The menu is then wrong and the Bombe misses the key.

With a right rotor of one notch, a crib of 13 letters contains the turnover about once in two. Hut 8 kept menus short, or drew several menus for the same crib, each assuming the turnover at a different place, and ran them all. Dan Girard, breaking Scharnhorst's last signal with a Bombe simulator, drew seven menus for its crib to allow for the turnover (Frode Weierud, CryptoCellar).

In the simulator, the exercises keep the middle rotor still under the crib. In intercepts and pasted text it can turn over: if no stop comes out right, untick the links at one end of the menu, so it covers only the letters before or after a turnover, and run again.

## Banburismus

A Navy key used one of 336 wheel orders and reflector B or C, and in 1941 there were few Bombes. Turing's Banburismus cut down the wheel orders to run.

All messages of a day started from the Grundstellung: each Verfahrenkenngruppe was typed there to give the Spruchschlüssel. Two messages whose Verfahrenkenngruppen agree in their first two letters therefore have Spruchschlüssel that agree in their first two letters too, and differ only in the right rotor. Their cipher texts are then in depth: encrypted with the same key, shifted by an unknown number of letters.

To find the shift, the cipher texts were punched on long sheets printed in Banbury (Banbury sheets) and laid over each other at every shift. Two German texts in depth have the same letter in the same place far more often (about 1 in 17) than random text (1 in 26), and Turing scored the evidence in his own unit, the ban (and the deciban). The shifts between many such messages, together with where the middle rotor turned over, told which rotor was on the right, and often the middle rotor too. The Bombes then had only a few wheel orders left to run. **Wheel orders already ruled out** in the notebook stands for this work.

Banburismus needed the bigram tables, to read the Verfahrenkenngruppen from the indicators. It was used until 1943, when there were enough Bombes. The Grundstellung alphabets and paired days, which gave the rings, are explained under [The left and middle rings](using-the-bombe.md#the-left-and-middle-rings).
