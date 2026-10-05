# Breaking the M4

[Back to The Bombe](README.md)

On 1 February 1942 the Atlantic U-boats' network, Triton, changed to the four-rotor M4. Bletchley Park called it Shark, and could read it on only a few days until December 1942. This page explains why, and the ways Hut 8 and the US Navy broke back in. The Bombe in the application has three drums per scrambler, so it can break an M4 message only in the cases described under [In the simulator](#in-the-simulator). The source is Patrick Mahon, *The History of Hut Eight* (1945).

## Why the M4 stopped the Bombe

The Greek rotor (Beta, later also Gamma) multiplies the rotor positions by 26. A three-drum Bombe tests one position of the Greek rotor per run, so every wheel order takes 26 runs instead of one, and in 1942 there were too few Bombes for that. It also put Banburismus out of the question: it would have needed about 26 times the traffic.

The Germans designed the M4 so that it could still work as a three-rotor machine. The Greek rotor and the thin reflector together act as a reflector, a different one at each of the 26 positions of the Greek rotor. With Beta at A and reflector B-thin, it is reflector B: the M4 then encrypts exactly like an M3. Mahon calls the Greek rotor the Zusatzwalze (extra wheel), part of the reflector rather than of the wheel order. Hut 8 worked out the wiring of Beta and B-thin in 1942 from messages sent by mistake with Beta away from A.

## Weather short signals

Short signals let a U-boat report briefly, so it could not be located by direction-finding while it transmitted. A weather short signal (WW) coded a weather report in a few letters with the Wetterkurzschlüssel (weather short-signal book). Its message key did not come from the indicator procedure but from a printed table, by a letter sent in clear and the time of day. The tables gave three letters only, so for the M4 an order said the Greek rotor stood at A. Every WW was therefore in effect encrypted on an M3, and a menu from WWs was a three-wheel job.

To crib a WW, Hut 8 needed what it said and how the book coded it:

- **The book.** On 30 October 1942 the destroyer HMS Petard forced U-559 to the surface off Port Said. Lieutenant Anthony Fasson and Able Seaman Colin Grazier went down with the sinking boat after passing up its papers; the canteen assistant Tommy Brown survived. Among the papers were the second edition of the Wetterkurzschlüssel and its message-key tables.
- **The weather.** The U-boats' reports were broadcast again from Germany in a weather code that the Met Section at Bletchley Park could read. Its decrypts, called Archery, gave the readings each U-boat had sent.
- **The menu.** The message-key tables gave each WW's start position, so the relative position of every letter of every WW was known. Several WWs of a day went into one menu.

The first Shark day came out on 13 December 1942. Until 10 March 1943, Hut 8 broke 88 of 99 days, all on WWs. Then the third edition of the weather book came into force, and Hut 8 turned to the other short signals, such as position and contact reports from the Kurzsignalheft: from March to the end of June 1943, it broke 87 of 112 days. These cribs grew weaker, and in June 1943 Shark took more than half of all Bombe hours.

## Re-encodements

U-boats in the Arctic used the three-rotor network Hydra, which Hut 8 read daily (Dolphin). They often passed on Shark messages, and a message read on Dolphin was a crib of the whole Shark message. Hut 8 ran these cribs on three-wheel Bombes fitted with fourth-wheel plugboards, one run for each position of the Greek rotor. In June 1943 it decided to run these slow but certain cribs instead of long programmes of weak short-signal menus.

On 1 July 1943 Shark brought in a second Greek rotor, Gamma, with the thin reflector C. Their wiring had to be found before the Bombe could test them: one day was broken by hand from a long crib, and the wiring was found in the middle of July. With Gamma at A, C-thin acts as reflector C. From August each month used one of four pairs, Beta or Gamma with B-thin or C-thin, for the whole month.

## Four-rotor Bombes

A Bombe with a fourth drum per scrambler tests every Greek rotor position in one run, but it must run 26 times faster. In Britain, Charles Wynne-Williams built the Cobra (12 were made), and Harold "Doc" Keen a high-speed Bombe on the frame of the three-wheel one. The first came into service in March 1943; in June 1943 a four-wheel Bombe broke its first Shark day.

The US Navy's codebreakers (OP-20-G) had Joseph Desch at the National Cash Register Company in Dayton, Ohio, build Bombes designed for four rotors from the start. The first two worked in July 1943, and about 125 were built. From August 1943 there were always enough cribs and Bombes for Shark. The best crib was Biscay Weather, a long weather report sent daily from the end of October 1943 until after D-Day. By the middle of 1944 OP-20-G ran the whole Shark attack, and Hut 8 sent the re-encodements.

## In the simulator

The Bombe in the application has three drums per scrambler and reflectors B and C. It breaks an M4 message only when the Greek rotor and thin reflector act as an M3 reflector, as in the short signals:

- Beta at A (ring 01) with B-thin works as reflector B,
- Gamma at A (ring 01) with C-thin works as reflector C.

Any other Greek position, which most M4 messages use, needs a four-rotor Bombe, which the application does not have. The [historical intercepts](using-the-bombe.md) and the exercises are three-rotor jobs.
