# Breaking a message

[Back to The Bombe](README.md)

This page breaks Frank Carter's weather crib step by step in the Hut 8 notebook, then outlines how an exercise goes on to read the day's traffic. [Using the Bombe](using-the-bombe.md) explains each control, and [How the Bombe broke Enigma](history.md) the ideas behind them.

## Carter's weather crib

Sixteen letters of a Navy weather message, used to train the Wrens and to demonstrate the rebuilt Bombe at Bletchley Park (Frank Carter, *The Turing Bombe*, Rutherford Journal 3). Switch to Bombe mode and open the Hut 8 notebook.

### 1. Choose the message

Choose the intercept **Carter's weather crib** and click **Load intercept**. The cipher text is:

```
SNMK GGST ZZUG ARLV
```

### 2. Place the crib

Click **Suggest crib**: WETTERVORHERSAGE (weather forecast), filling the whole message. Click **Set crib**. A crib as long as the message has only one position, and it has no crashes:

```
S N M K G G S T Z Z U G A R L V
W E T T E R V O R H E R S A G E
```

Click **Place crib**.

### 3. Draw the menu

Each column is a link, numbered from 1: S–W at 1, N–E at 2, M–T at 3, and so on. The notebook builds a menu of 12 links on 11 letters, with the test register on G, the letter with the most links:

| Link | 2 | 5 | 6 | 7 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Letters | N–E | G–E | G–R | S–V | Z–R | Z–H | U–E | G–R | A–S | R–A | L–G | V–E |
| Drums | ZZB | ZZE | ZZF | ZZG | ZZI | ZZJ | ZZK | ZZL | ZZM | ZZN | ZZO | ZZP |

Links 3, 4 and 8 (M–T, K–T and T–O) are not connected to the rest, and link 1 (S–W) is left out to keep the menu on one chain of 12. The menu has two loops: G–R twice (links 6 and 12), and E–G–R–A–S–V–E (links 5, 6, 14, 13, 7 and 16). The summary expects about 3.5 stops a wheel order with the diagonal board, and over 700 without it.

Carter's own menu also has link 1. Tick link 1, S–W at ZZA, in the **Links** list to try it: 13 links, still two loops, and about one stop a wheel order, but it takes two chains joined together. Untick it again for the rest of this example.

Click **Send the menu to the Bombe**. The notebook plugs up the menu on each of the three chains.

### 4. Run the Bombe

Click **Wheel orders already ruled out**: only II V III, VI III VIII and IV I VII are left. On the **Front** tab, fit one wheel order on each chain: drop each drum on scrambler 12 of its row, so the row fills from scrambler 1. On the **Side** tab, turn the reflector to **B**, turn the speed to full and press **Start**. Run again with reflector **C**: six runs in two.

With reflector B, II V III gives four stops:

| Indicator | Stecker |
|---|---|
| SNY | G/D |
| DKX | G/Q |
| FAN | G/K |
| OUG | G/K |

The other wheel orders give a few stops of their own, and so does reflector C. One stop is true.

### 5. Choose a stop

The notebook lists the stops. Try DKX G/Q: click it, then **Check**. The notebook sets up the checking machine for it.

### 6. Check the stop

The Bombe says G is steckered to Q. Follow the links from G:

- Link 5 joins G and E at ZZE. Turn the drums to ZZE and press Q: lamp T lights, so E/T.
- Link 2 joins N and E at ZZB. Turn to ZZB and press T, the partner of E: the lamp gives the partner of N, V.
- Go on along the menu in the same way.

The notebook writes each lamp on the stecker sheet. The menu's links give A/D, E/T, H/M, L/J, N/V, U/F and Z/P, with G/Q, and R and S unsteckered, and no letter gets two partners. Mark it **True stop**. A false stop, such as SNY G/D, soon gives a letter two partners.

### 7. Read the message

With the menu's steckers and every other letter unsteckered, the decrypt reads WETCERVXRHERSAGE: almost there. Click **Find** for the right ring: ten rings tie, the ones that do not turn the middle rotor over within the sixteen letters, so any of them reads the crib. Click **Suggest**: it proposes I/K and O/X, letters the menu does not reach, and W unsteckered. Click **Accept all**: the decrypt reads WETTERVORHERSAGE.

The key is reflector B, wheel order II V III and the plugs AD ET FU GQ HM IK JL NV OX PZ. The indicator reading DKX gives the rings to try on the Enigma: add the drum offsets 1, 3 and 1 to get ENY. Click **Set up Enigma** to type the cipher text on the Enigma yourself.

Carter's crib has no indicator, so the work ends here: the notebook gives the published rings instead.

## An exercise

An exercise goes the same way, then on to the indicators and the day's other messages. Generate or import an M3 key sheet first.

1. **Choose the message.** Click **New exercise**. The hint says what kind of message it is.
2. **Place the crib.** Click **Suggest crib**: the crib stands at or near the start, after a short prefix such as AN BDU or the hour. **Earlier messages from this operator** gives two positions; try the first, and if no stop is true, come back for the other.
3. **Draw the menu.** The menu at the right position has at least two loops.
4. **Run the Bombe.** **Wheel orders already ruled out** leaves three wheel orders; run them with reflectors B and C.
5. **Choose a stop**, **check it** and mark it true or false, as above.
6. **Read the message.** Find, Suggest and Find again until the decrypt reads as German. In a long message, also find the middle ring, and read the decrypt to judge it.
7. **Read the indicators.** Click **Take the pinch** for the day's Grundstellung and Tauschtafel. Look up each vertical pair of the indicator groups in the Tauschtafel to get the Schlüsselkenngruppe and the Verfahrenkenngruppe, or click **Fill in**. In the ring table, click the square that shows the stop's indicator reading: it gives the left and middle rings, and the Key now holds the whole key.
8. **The day's traffic.** For each of the day's other messages, read its indicator, click **Set up Enigma at the Grundstellung**, type the Verfahrenkenngruppe to get its Spruchschlüssel, turn the rotors to it and type the cipher text. The **Lamps** tab of the operator's notebook writes down the plain text.
