# The Enigma in the Kriegsmarine

[Back to The Enigma](README.md)

## The machine

Arthur Scherbius patented his rotor cipher machine in 1918 and sold it commercially as the Enigma. The German Navy (then the Reichsmarine) adopted it in 1926, the first of the German armed forces to do so.

Pressing a key sends current through the plugboard, the entry wheel, the rotors from right to left, the reflector (Umkehrwalze, UKW), and back through the rotors and plugboard to a lamp. The rightmost rotor steps before every letter, and the others step like an odometer, so each letter is encrypted with a different wiring. Two properties follow from the reflector:

- The machine is reciprocal. With the same settings, typing the cipher text gives back the plaintext.
- A letter never encrypts to itself. This was a serious weakness, and the codebreakers exploited it.

The Navy's three-rotor models (M1 to M3) took three of eight rotors. Rotors I–V were shared with the Army and the Air Force, and VI–VIII were used only by the Navy. On 1 February 1942 the U-boats in the Atlantic changed to the four-rotor M4. It has a thin reflector and an extra Greek rotor (Beta or Gamma) that never steps. With Beta at A and reflector B-thin, it works exactly like an M3 with reflector B, so an M4 could still talk to an M3.

## Key sheets and the daily key

Each radio network (Schlüsselkreis), such as Hydra in home waters or Triton for the Atlantic U-boats, had its own key sheets. A sheet gave the settings for every day of the month:

- the inner settings (innere Einstellung): the reflector, the rotor order (Walzenlage) and the ring settings (Ringstellung). These changed less often and were set by an officer.
- the outer settings (äußere Einstellung): the plug connections (Steckerverbindungen) and the Grundstellung. These were set by the radio operator.

The sheets were printed in water-soluble ink, so they could be destroyed quickly if a ship or U-boat was about to be captured.

## Why every message needs its own key

If every message of the day started at the Grundstellung, all the messages would be encrypted in the same way, and comparing them would reveal the plaintext. Every message therefore gets its own start position, the Spruchschlüssel (message key). The Navy's procedure hid this message key more carefully than the Army's:

1. From the Kenngruppenbuch (indicator book), the operator picked two trigrams. The Schlüsselkenngruppe told the receiver which key the message used. The Verfahrenkenngruppe was a random choice.
2. The Verfahrenkenngruppe, typed at the day's Grundstellung, gave the Spruchschlüssel.
3. Both trigrams were written into the indicator and disguised with a bigram table (Doppelbuchstabentauschtafel) before they were sent.

The receiver reversed the table, typed the Verfahrenkenngruppe at the same Grundstellung, and so found the same Spruchschlüssel. [Sending by hand](sending-by-hand.md) and [Receiving by hand](receiving-by-hand.md) walk through each step.

## Breaking the Navy Enigma

At Bletchley Park, Hut 8 worked on the Navy's traffic. Alan Turing worked out the indicator procedure, and electromechanical bombes searched for the daily keys. Reconstructing the bigram tables by analysis was slow, and captured material helped a great deal: in 1941 it came from the trawler Krebs, the weather ships München and Lauenburg, and U-110.

The M4 cut Bletchley Park off from the U-boat net, which it called Shark, for most of 1942. Papers recovered from U-559 in October 1942 helped break back in from December 1942.

The [receiving page](receiving-by-hand.md) has two real messages to decrypt: one from U-264 in November 1942, and one sent by the battleship Scharnhorst on 26 December 1943, the day she was sunk at the Battle of the North Cape.
