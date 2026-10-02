# The Bombe

[Back to the contents](README.md)

The Bombe was the electromechanical machine that Bletchley Park used to find the daily Enigma key. It tests a crib, a guessed piece of plaintext, against the cipher text at every rotor position and stops at the positions where the guess could be right.

## Switching modes

The title at the top left switches between the two modes. The active mode is in capitals; click the other one to switch. Each mode keeps its state while the other is shown. While an Enigma key is held down, the mode cannot be switched.

In Bombe mode, the book button opens these instructions.

## The Hut 8 notebook

Breaking a message is worked in the Hut 8 notebook, a separate window on squared paper, opened with the notebook button at the top right of Bombe mode. The machine window keeps the machines: the **Front**, **Side** and **Back** of the Bombe and the **Checking** machine. You set them up by hand, or let the notebook set them up for you.

The notebook walks through the steps one by one: choose the message, place the crib, draw the menu, run the Bombe, choose a stop, check the stop, read the message, read the indicators and read the day's traffic. The current step is highlighted. A finished step is ticked off in the margin with what it wrote down. Click **Change** to reopen it: change it, and the steps after it start again, or click **Keep as it is**. Both windows show the same job, so what you do in one shows in the other.

## Loading a message

The first step loads the message to break:

- **Intercept**: a historical message, such as Scharnhorst's last signal. Choose it and click **Load intercept**.
- **New exercise**: a Navy message sent on a random day of one of your M3 key sheets, a day with rotor I–V on the right. The middle rotor never turns over during its crib, and the menu built with the crib in its right place has at least two loops, so a crib position whose menu has fewer is never the right one. This is not historical: Hut 8 had to work with the menus the day's traffic gave, and a poor crib could leave a key unbroken. The exercises are made to show how the Enigma was broken, so each one can be broken. Generate or import M3 key sheets first.
- **Radio message or cipher text**: paste a Navy radio message, as the operator's notebook writes it, or bare cipher text, and click **Load pasted text**.

The notebook writes down the message, a hint for intercepts and exercises, and the cipher text in groups of four. Loading a message removes the crib.

## Placing the crib

A crib is a piece of plaintext you expect in the message, such as `WETTERVORHERSAGE` (weather forecast). Type it in the **Crib** field and click **Set crib**. Only letters count.

**Suggest crib** fills in a likely crib and says where in the message it is likely to stand. For an intercept or exercise it suggests the message's own crib at once. For pasted text it first asks what kind of message it is: a weather forecast, nothing to report, a U-boat position report or a convoy report. Choose one and click **Suggest**; with **Don't know** there is no crib to suggest. Change the crib if you like, then click **Set crib**.

The notebook writes the cipher text in squares, with the crib on a slip under it. The Enigma never encrypts a letter to itself, so where a crib letter sits under the same cipher letter, the crib cannot be at that position: a crash, written in red with the crib letter struck through. Slide the crib to a position without crashes:

- drag the crib sideways,
- or press Arrow Left and Right, Home and End in the notebook (not while typing in the crib field),
- or click ◀ and ▶.

Under the strip you see the position and the number of crashes. **Place crib** places the crib at a position without crashes and builds the menu from it.

For an exercise, **Earlier messages from this operator** under the strip narrows the search: operators started their messages the same way day after day, so the notebook writes down the crib and two positions to expect it at, counted from 1. One is the right one. The other is a decoy without crashes whose menu is just as good, so you have to try both. The positions stay written down until you load another message.

## The menu

The notebook sketches the menu built from the placed crib. Each crib letter and the cipher letter above it form a link, numbered by its place in the crib. On the Bombe one scrambler joins the two letters, set that many steps from the first (1 = ZZA). The sketch shows every link of the crib:

- firm pencil links are plugged up and tested,
- dashed red links are plugged up but not connected to the test register letter, so they test nothing,
- faint dotted links are not on the menu.

Loops (closures) make a menu good. At a wrong position, each loop lets the current through with a chance of about 1 in 26, so more loops mean fewer false stops. The summary counts the links, letters and loops connected to the test register letter. It also runs the menu on six wheel orders and reflectors, which takes a moment, and gives the average false stops per wheel order with and without the diagonal board. This is a sample, so a run can give somewhat more or fewer.

To change the menu:

- click a link in the sketch, or tick it in the **Links** list, to plug it in or out,
- click a letter on the menu to put the test register on it (the ringed letter),
- drag letters to tidy the sketch.

**Build menu again** builds the menu from the part of the crib with the fewest expected stops, with the test register on the letter with the most links.

## Running the Bombe

When the menu is ready, click **Send the menu to the Bombe**. The notebook plugs up the Bombe in the machine window with the menu and follows the run. If you plugged the Bombe by hand, it asks first. When you change the cables or turn a scrambler by hand afterwards, the notebook says so and offers **Plug it up again**.

You can also leave the notebook closed and work with pen and paper: plug up the Bombe, run it, write down the stops and set up the checking machine yourself. The machines work the same either way.

The **Front** tab shows the Bombe as the operators saw it: a rack of drums, then three banks (chains) of twelve scramblers, each with three drums (upper, middle, lower) standing for the Enigma's left, middle and right rotors. The drum rims are coloured by rotor, as on the real machine. The three cream drums to the right of the second bank are the indicator drums: they read the position with the letters reversed. Below them are the **Start**, **Stop** and **Continue** buttons, the same as on the Side. Under each scrambler are the letters its jacks are cabled to on the back.

Each chain is a Bombe of its own, with its own drums, so a menu of up to 12 links plugged up on all three chains tests three wheel orders in one run. A longer menu takes two or three chains joined together. The notebook plugs up the menu this way: each chain's scramblers in order of the links' offsets, each scrambler set to its link's offset (ZZA, ZZB, ...).

Set up the drums as a Wren did:

- **Fit drums**: drag a drum from the rack onto a drum place, or click it in the rack and then click the place. The drums fill that row of the chain from the first scrambler up to the place, so dropping them on scrambler 9 fits nine drums. A rotor can be in only one row of a chain.
- **Take a drum out**: click it, or drag it off the machine.
- **Turn a drum** with the mouse wheel over it, or Arrow Up/Down on it. The run uses the letters on the machine, so a drum set wrong makes the Bombe miss the key.

The label above each chain gives its wheel order. The Bombe runs with whatever is set up: a scrambler cabled without all its drums passes no current, and drums without cables do nothing. A chain with a test register but no scrambler with cables and all three drums is left out of the run, so you can fit drums on one chain only. The list on the **Side** tab says what a run will not use.

The Bombe drums are lettered ahead of the Enigma rotors: drums I, II, III, VI, VII and VIII by one letter, IV by two and V by three. The drums and the indicator show these historical letters, so to get the ring settings to try on the Enigma, add the offsets to the indicator reading. On Carter's weather crib (wheel order II V III) the indicator reads DKX, as Carter reports; adding 1, 3 and 1 gives the ring settings ENY.

## The side of the Bombe

The **Side** tab shows the right-hand end of the machine: the test register, and under it the switches, the speed knob and the buttons. Above it are the reason the Bombe cannot start yet, the list of what a run will not use, and the run's progress. Before you start:

- set the **Diagonal board** switch. It turns Welchman's diagonal board on or off; it is on by default, and without it a menu gives many more false stops,
- turn the **Reflector** switch to **B** or **C**,
- plug a test register onto a common on the **Back** tab,
- set the **Speed** knob, by dragging round it or with the arrow keys. At the left end the Bombe runs at the speed of a real Bombe, 28.2 positions a second: a run of all 17,576 positions without stops takes 10.4 minutes. This speed comes from the Bombe Speed section of the Bombe description by the Turing-Welchman Bombe rebuild project (bombe.org.uk/bombe-description). Further right it runs faster, and at the right end at full speed, which takes a second or so.

Press **Start**. The drums turn through every position once, and each chain (or group of joined chains) with a test register is tested. The bar and the line under it show the chains and their wheel orders, how far the run has got, the stops found and the time taken. You can turn the speed knob while it runs, and **Stop** ends the run. The run goes on in the background when you switch tabs or modes.

At a set speed the drums on the Front turn with the run, and the Bombe halts at each stop, as the real one did. The stop lamp lights, the indicator drums on the Front give the reading, and the test register shows its letter and its 26 wires with the live ones lit, with the chains, wheel order and stecker partner under them. Press **Continue** to run on. At full speed the Bombe does not halt.

### Wheel orders already ruled out

A Navy key used one of 336 wheel orders of rotors I–VIII, with reflector B or C: 672 runs (120 for the Army's five rotors). Bletchley Park and its out-stations ran many Bombes on the same menu side by side, each with its own wheel orders. For an intercept or exercise, click **Wheel orders already ruled out** in the run step of the notebook: the Wrens on the other Bombes have run every other wheel order without a true stop, and only three are left to you. One of them is the key's. Run each with reflector B and with C: six runs. With a menu of up to 12 links, fit one on each chain to run all three at once. The notebook keeps them written down until you load another message. Pasted text has none.

## The back of the Bombe

The **Back** tab shows a group of socket strips for each chain: the commons on the left (one per letter), the two jacks of each of its twelve scramblers on the right, and the test register and input wire at the foot. Cable them as on the plugboard:

- drag a jack onto a common, or a common onto a jack,
- or click one and then the other,
- click a plugged jack to pull its cable out, or drag its end to another common or off the commons.

A jack plugs into the commons of its own chain. The test register is plugged onto a common the same way: it watches that letter's cable.

- The **Join** switches between the chains cable a chain to the next, for menus of more than 12 links. Joined chains share their commons and the first chain's test register.
- **Input wire**, turned with its arrows or Arrow Up/Down, sets the wire of each test register cable that the current goes into: the guessed stecker partner of the test register letter. It is A, or B when the test register is on A.

Nothing on the Bombe can change while it runs or waits at a stop.

## The stops

The Bombe prints every stop on the **Printout** under the Front: the chains, the wheel order, the indicator reading, the test register letter, its live wires (a dot for each dead wire) and the stecker they give. It shows a hundred at a time, with **Load more**, and keeps them until you click **Clear printout**.

While the Hut 8 notebook is open and the Bombe is plugged up with its menu, a run also writes its stops in the notebook, with the placed crib, a hundred at a time: the wheel order, the indicator reading, the stecker of the test register letter and your verdict. Fit other drums and run again to add the stops of more wheel orders. **Load more** shows the next hundred. Click a stop, or its **Check** button, to check it. To check stops while the run goes on, click **Check the stops found so far**. Changing the message, crib or menu clears the notebook's stops and their checks, and so does **Clear stops**; the checking machine then forgets the stop it was set up for.

## Checking a stop

Most stops are false. Hut 8 tested each one on a checking machine: an Enigma without plugboard whose rotors do not step, with Bombe drums. The **Checking** tab of the machine window shows it, with the reflector cartridge in the slot on its side, four drum places and the spare drums and cartridges in the racks above. The left place holds a dummy drum that passes every letter straight through, so the machine works as a three-rotor Enigma; it is fitted by default. Each drum has its letters round the face, the window letter at the mark on top, and a coloured ring with a black dot at the ring letter.

Checking a stop in the notebook sets the machine up for it: the stop's reflector, the dummy drum and the stop's drums, the rings at the stop's indicator and the windows at ZZZ. If you set the machine up by hand, the notebook asks first. To check a stop from the printout, set it up yourself:

- **Fit the reflector**: drag a cartridge (B, C, B thin or C thin) from its rack into the slot, or click it and then the slot. Click the fitted cartridge, or drag it off, to put it back.
- **Fit a drum**: drag it from the rack onto a drum place, or click it in the rack and then the place. The dummy drum fits only the left place, rotors I–VIII only the other three. Click a fitted drum, or drag it off, to put it back.
- **Turn a drum** with its thumbwheel: click the top half to turn it up, the bottom half to turn it down, or drag. The ring turns with it.
- **Set a ring** by dragging the coloured ring round the drum, or with Arrow Up/Down on it.
- **Press a key**, by clicking it or typing the letter; once the reflector, the dummy drum and all three drums are fitted, the lamp of the letter it goes to lights while the key is held. While the notebook checks a stop, letters typed in the notebook press the checking machine too.

To check the stop, follow the links from the stecker the Bombe found. The notebook's **Crib** gives a column for each crib letter, headed by its link's drum position (ZZA, ZZB, ...), with the cipher letter on top and the crib letter at the bottom. Between them it writes the partners found so far: under the cipher letter its partner, above the crib letter its partner. A column with one partner and a gap is a link you can test next. For a link at ZZE, turn the drums to ZZE, press the stecker partner of one letter and read the lamp: that is the stecker partner of the other letter. For example, for a stop with indicator SNY and G/D, turn the drums to ZZE for link G–E and press D: lamp P lights, so E/P.

The notebook writes each lamp on the **Steckers** sheet for you: when the drums stand at a link and the key you press is a partner already written for one of its letters, the lamp is written as the partner of the other letter (the letter itself when it is unsteckered). While checking you cannot type in the sheet. A letter can have only one partner, so when a lamp gives a letter a second partner, both are kept and the letter and its partners are marked in red: a sign of a false stop, or of a key pressed at the wrong position. Red letters count as unknown for the crib, the decrypt, Suggest and Find. Click a box to rub out that letter's pairs.

The crib letter is underlined green when the steckers encipher it correctly, struck through when they contradict it, and faint while it is still unknown. Partners in contradiction are red.

### The verdict

Mark the stop **True stop** or **False stop** (or **Unchecked** again). The verdict shows in the list of stops; after **False stop** the notebook goes back to it. It also tells you whether the crib matches. For an intercept or exercise, it says whether the stop really is the true one, and which pairs are wrong or missing.

## Reading the message

After **True stop**, the notebook goes on to **Read the message**, the work Hut 8 did on an Enigma: finding the steckers the menu does not reach and the right ring, until the whole message reads as German. The **Steckers** sheet is shown again, and here you can write in it: type a letter in a box to make it that letter's partner (the pairs either letter had are rubbed out), or clear the box to rub the letter out. Pairs found while checking the stop are highlighted, so you can see which pairs came from the checking and which you added since. A letter whose partner is not found yet shows itself faintly: it is taken as unsteckered, as when you set up an Enigma with only the plugs you know. The **Decrypt** shows the whole message with the steckers found so far and every other letter unsteckered, so you see what the Enigma would print.

### Letters the menu does not reach

**Suggest** proposes steckers for letters the menu does not reach, scored on how much the decrypt looks like Navy German. It proposes a pair only when the pair clearly beats every other partner for that letter, never contradicts the crib, and stops at ten plug pairs. Accept the pairs you agree with one by one, or click **Accept all**. You can change any pair afterwards on the sheet.

The scoring counts letters, pairs and triples of letters from the Navy messages the simulator comes with, half and half with general German from Theodor Fontane's *Effi Briest* (Project Gutenberg), written as the Navy wrote: ä as AE, ß as SZ, CH as Q, X for punctuation, no spaces.

### The right ring

The Bombe finds the rotor cores, not the ring settings. For the right rotor, 26 pairs of ring and window letter give the same core; they differ only in where the middle rotor turns over. The **Right ring** picks one of them. A wrong right ring garbles the message from the wrong turnover on. Turn it with ◀ and ▶ (the core positions stay), or click **Find**. Find scores the decrypt with each of the 26 rings and sets the lowest ring with the best score. The bars show every ring's score, with the best ones highlighted. When several rings tie, the ring is not settled yet: find or accept more steckers, then click **Find** again. A good order is Find, Suggest, Find.

### The middle ring

The same holds for the middle rotor: its ring sets where the left rotor turns over. Once the middle rotor has stepped far enough to reach its notch, it steps again with the left rotor (the double step). In a long message, a wrong middle ring garbles the message from that letter on. The **Middle ring** works like the right ring: turn it with ◀ and ▶, or click **Find** to score the 26 middle rings with the right ring kept. Find the middle ring after the right ring and the steckers. When the message is too short for the left rotor to turn over, most middle rings tie and any of them reads it. Find only scores how German the decrypt looks, so where the rings differ in a letter or two, such as the X padding at the end, it can pick the wrong one: read the decrypt yourself. The left ring stays at Z until the indicators are read: the left rotor turns nothing, so it does not change the message.

### The left and middle rings

The left ring does not change the message, and the middle ring only where the left rotor turns over. They do matter for the day's other messages, whose start positions come from their indicators. The bigram tables turn a message's indicator into its Verfahrenkenngruppe. The operator typed that trigram at the day's Grundstellung, and the lamps gave the message key. The Grundstellung was printed on the secret key sheet and changed daily. One broken message therefore leaves 676 possibilities: for every pair of left and middle rings there is a Grundstellung that turns its Verfahrenkenngruppe into its message key. The Army sent its Grundstellung in the clear, so there the one ring pair that fits can be read off a table of all 676. With the Navy that table fits on every row.

A pinch made the table work for the Navy too: when a captured key sheet or bigram table gave away a day's Grundstellung, the one ring pair that fits could be read off as for the Army. The notebook works it this way, in the next step.

Without a pinch, Hut 8 had two other ways to find the rings:

- **Paired days.** The wheel order and the rings changed every other day, the steckers and the Grundstellung daily. Rings found on one day held for its paired day, which was often broken next on the known wheel order.
- **Grundstellung alphabets.** Each broken message of the day gives a trigram and the start position it was typed to. Messages broken one by one on cribs or the EINS catalogue (the four letters EINS enciphered at all 17,576 positions and looked up in the cipher texts), or set in depth by Banburismus, built up for each trigram letter the start position it gives: the Grundstellung alphabets. With enough messages they fix the Grundstellung and the rings, and every other message of the day can be set up from its indicator. Short signals from U-boats served the same purpose.

### The key

The step ends with the key: the reflector, wheel order, rings, plugs and the message key: the rotor positions at the start of the message. **Set up Enigma** asks first, then sets up the Enigma with this key at the message key and switches the machine window to Enigma mode, ready to type the cipher text.

For a Navy radio message, **Read the indicators** goes on to the next step. An intercept ends here, as its key sheet day is not known; the notebook gives its published rings instead. Bare cipher text has no indicator, so it ends here too.

## Reading the indicators

This step finds the left and middle rings with a pinch of the day the message was sent on.

- **The pinch.** For an exercise, click **Take the pinch**. For a pasted radio message, choose the month, the key sheet and the day it was sent on, as in the Enigma's key sheet panel, then click **Take the pinch**. If you choose the wrong day, the indicator reads as nonsense and no ring pair fits. The notebook writes down the day's Grundstellung and its Tauschtafel; open the Tauschtafel to see it. It scrolls when it does not fit, with its row and column letters always in view, and the letters of the square under the mouse are highlighted. Taking the pinch also brings in the day's other messages for the next step.
- **The indicator.** The two indicator groups are written one above the other. Look up each vertical pair in the Tauschtafel: find the row of its upper letter and the column of its lower letter, and write down the pair you find there. The upper row then reads a filler and the Schlüsselkenngruppe, the lower row the Verfahrenkenngruppe and a filler. Write both trigrams in their boxes. Each box is marked ✓ or ✗ once it has three letters. **Fill in** writes them for you.
- **The ring table.** Once the Verfahrenkenngruppe is right, the notebook works out the ring table, as Hut 8 did by hand. Each square is a pair of rings, with the left ring by row and the middle ring by column. For each pair, the notebook sets up an Enigma with the key found so far and those rings, turns it to the Grundstellung and types the Verfahrenkenngruppe; the lamps give the Spruchschlüssel. From there the rotors step to the start of the crib, and the square shows the indicator reading the Bombe would give there. Find the square that shows the stop's indicator reading, written above the table, and click it. The notebook does not mark the square for you, and the step stays open until you click a square with the stop's indicator reading. Now and then a second square fits by chance, and its decrypt then reads as nonsense.

The **Key** then gives the whole key: wheel order, all three rings, the plugs and the Spruchschlüssel. If the square's indicator reading differs from the stop's, the notebook warns you. If its middle ring makes the left rotor turn over at another letter than the middle ring in Read the message, the notebook says how many letters read differently: read both decrypts and judge which one makes sense. For an exercise it also says whether these are the rings of the key sheet. The decrypt shows the message read with this key. Click another square to read other rings, or **Rub out the rings**.

## The day's traffic

With the whole key, Hut 8 could read every other message sent on that key that day. The last step lists them: three to five messages, such as weather forecasts, position and convoy reports, rendezvous orders, mine warnings and air attack reports. **Copy** next to a message copies it as received. Read each one as its receiving operator did:

1. Read its indicator with the Tauschtafel and write down the Schlüsselkenngruppe and the Verfahrenkenngruppe, or click **Fill in**.
2. Click **Set up Enigma at the Grundstellung**. The notebook asks first, then sets up the Enigma with the whole key, turns it to the Grundstellung and switches the machine window to Enigma mode.
3. Type the Verfahrenkenngruppe. The three lamps give the Spruchschlüssel.
4. Turn the rotors to the Spruchschlüssel and type the cipher text.

The **Lamps** tab of the operator's notebook writes down every lamp, so you can read the plain text there. Set up the Enigma again before each message.
