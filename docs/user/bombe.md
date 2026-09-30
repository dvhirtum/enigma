# The Bombe

[Back to the contents](README.md)

The Bombe was the electromechanical machine that Bletchley Park used to find the daily Enigma key. It tests a crib, a guessed piece of plaintext, against the cipher text at every rotor position and stops at the positions where the guess could be right.

## Switching modes

The title at the top left switches between the two modes. The active mode is in capitals; click the other one to switch. Each mode keeps its state while the other is shown. While an Enigma key is held down, the mode cannot be switched.

In Bombe mode, the book button opens these instructions.

## The Hut 8 notebook

Breaking a message is worked in the Hut 8 notebook, a separate window on squared paper, opened with the notebook button at the top right of Bombe mode. The machine window keeps the machines: the **Front** and **Back** of the Bombe and the **Checking** machine.

The notebook walks through the steps one by one: choose the message, place the crib, draw the menu, run the Bombe, choose a stop, check the stop and read the message. The current step is highlighted. A finished step is ticked off in the margin with what it wrote down. Click **Change** to reopen it: change it, and the steps after it start again, or click **Keep as it is**. Both windows show the same job, so what you do in one shows in the other.

## Loading a message

The first step loads the message to break:

- **Intercept**: a historical message, such as Scharnhorst's last signal. Choose it and click **Load intercept**.
- **New exercise**: a Navy message sent on a random day of one of your M3 key sheets. Generate or import M3 key sheets first.
- **Radio message or cipher text**: paste a Navy radio message, as the operator's notebook writes it, or bare cipher text, and click **Load pasted text**.

The notebook writes down the message, a hint for intercepts and exercises, and the cipher text in groups of five. Loading a message removes the crib.

## Placing the crib

A crib is a piece of plaintext you expect in the message, such as `WETTERVORHERSAGE` (weather forecast). Type it in the **Crib** field and click **Set crib**. Only letters count.

The notebook writes the cipher text in squares, with the crib on a slip under it. The Enigma never encrypts a letter to itself, so where a crib letter sits under the same cipher letter, the crib cannot be at that position: a crash, written in red with the crib letter struck through. Slide the crib to a position without crashes:

- drag the crib sideways,
- or press Arrow Left and Right, Home and End in the notebook (not while typing in the crib field),
- or click ◀ and ▶.

Under the strip you see the position and the number of crashes. **Place crib** places the crib at a position without crashes and builds the menu from it.

## The menu

The notebook sketches the menu built from the placed crib. Each crib letter and the cipher letter above it form a link, numbered by its place in the crib. On the Bombe one scrambler joins the two letters, set that many steps from the first (1 = ZZA). The sketch shows every link of the crib:

- firm pencil links are plugged up and tested,
- dashed red links are plugged up but not connected to the test register letter, so they test nothing,
- faint dotted links are not on the menu.

Loops (closures) make a menu good. At a wrong position, each loop lets the current through with a chance of about 1 in 26, so more loops mean fewer false stops. The summary counts the links, letters and loops connected to the test register letter, and estimates the false stops per wheel order with and without the diagonal board.

To change the menu:

- click a link in the sketch, or tick it in the **Links** list, to plug it in or out,
- click a letter on the menu to put the test register on it (the ringed letter),
- drag letters to tidy the sketch.

**Build menu again** builds the menu from the part of the crib with the fewest expected stops, with the test register on the letter with the most links.

## Running the Bombe

When the menu is ready, click **Send the menu to the Bombe**. The Bombe is plugged up and run in the machine window; the notebook follows the run and writes down the stops.


The **Front** tab shows the Bombe as the operators saw it: three banks (chains) of twelve scramblers, each with three drums (upper, middle, lower) standing for the Enigma's left, middle and right rotors. The drum rims are coloured by rotor, as on the real machine. The three drums on the right are the indicator drums: they read the position with the letters reversed.

The menu is plugged up once on each chain it fits: a menu of up to 12 links fits three times, so the Bombe tests three wheel orders in one run. A longer menu takes two or three chains and fits once. **Build menu again** keeps menus to 12 links; a menu edited by hand can be longer. Each copy's links take its scramblers in order of their offset, and each scrambler starts at its link's offset (ZZA, ZZB, ...). The label above each chain gives its wheel order; a menu on two or three chains is labelled once, such as "Chains 1–2 · II V III".

Set up each copy as a Wren did:

- **Fit drums**: click a drum and pick a rotor. The rotor goes into that row of every scrambler of the copy. A rotor already in another row of the copy cannot be picked; **Empty** takes the drums out.
- **Turn a drum** with the mouse wheel over it, or Arrow Up/Down on it. The run uses the letters on the machine, so a drum set wrong makes the Bombe miss the key.

Copies without drums are not tested. A copy with drums in only some rows must be finished or emptied before the Bombe can start.

The Bombe drums are lettered ahead of the Enigma rotors: drums I, II, III, VI, VII and VIII by one letter, IV by two and V by three. The drums and the indicator show these historical letters, so to get the ring settings to try on the Enigma, add the offsets to the indicator reading. On Carter's weather crib (wheel order II V III) the indicator reads DKX, as Carter reports; adding 1, 3 and 1 gives the ring settings ENY.

Before you start:

- choose reflector **B** or **C**,
- fit the drums of at least one copy,
- set the speed. At the left end the Bombe runs at its historical speed, a run of all 17,576 positions in about 20 minutes; further right it runs faster, and at the right end at full speed, which takes a second or so.

Click **Start**. The drums turn through every position once, and each copy with drums is tested with its wheel order. The bar and the line under it show the wheel orders, how far the run has got, the stops found and the time taken. You can change the speed while it runs, and **Stop** ends the run. The run goes on in the background when you switch tabs or modes, or close the notebook.

At a set speed the drums turn with the run, and the Bombe halts at each stop, as the real one did. It shows the wheel order, the indicator reading, and the stecker partner of the test register letter. Click **Continue** to run on. At full speed the Bombe does not halt; it counts the stops.

## The back of the Bombe

The **Back** tab shows how the menu is plugged up. Each letter on the menu has a common, and each scrambler's two jacks are cabled to the commons of its link's letters. The commons are also cabled to the diagonal board, and the test register sits on the test register letter.

- **Diagonal board** switches Welchman's diagonal board on or off. It is on by default; without it a menu gives many more false stops.
- **Input on wire** sets the wire of the test register cable that the current goes into: the guessed stecker partner of the test register letter. It is A, or B when the test register is on A.

The run settings cannot change while the Bombe runs or waits at a stop.

## The stops

Once the run has ended, the notebook lists the stops of every run on the menu, a hundred at a time: the wheel order, the indicator reading, the stecker of the test register letter and your verdict. Fit other drums and run again to add the stops of more wheel orders. **Load more** shows the next hundred. Click a stop, or its **Check** button, to check it. To check stops while the run goes on, click **Check the stops found so far**. Changing the message, crib or menu clears the stops and their checks, and so does **Clear stops**.

## Checking a stop

Most stops are false. Hut 8 tested each one on a checking machine: an Enigma without plugboard whose rotors do not step, with Bombe drums. The **Checking** tab of the machine window shows it, set up for the stop you picked, with its reflector wheel, three drums and the spare drums in the rack above. Each drum has its letters round the face, the window letter at the mark on top, and a coloured ring with a black dot at the ring letter. The machine starts with the rings set to the stop's indicator and the windows at ZZZ.

- **Turn a drum** with its thumbwheel: click the top half to turn it up, the bottom half to turn it down, or drag. The ring turns with it.
- **Set a ring** by dragging the coloured ring round the drum, or with Arrow Up/Down on it.
- **Press a key**, by clicking it or typing the letter; the lamp of the letter it goes to lights while the key is held.

To check the stop, follow the menu from the stecker the Bombe found. The notebook's **Menu links** list gives each link with its drum position. For a link at ZZE, turn the drums to ZZE, press the stecker partner of one letter and read the lamp: that is the stecker partner of the other letter. For example, for a stop with indicator SNY and G/D, turn the drums to ZZE for link G–E and press D: lamp P lights, so E/P. Write each partner on the **Steckers** sheet in the notebook. Type a letter itself for an unsteckered letter, and clear the box when a partner is unknown. Changing one partner removes the pair the letter had before. A letter can have only one partner, so a contradiction shows the stop is false.

The **Crib** writes each crib letter under its cipher letter: underlined green when the steckers encipher it correctly, struck through when they contradict it, and faint while it is still unknown. The **Decrypt** shows the whole message with the steckers found so far, with **?** where a stecker is still unknown.

### Letters the menu does not reach

**Suggest** proposes steckers for letters the menu does not reach, scored on how much the decrypt looks like Navy German. It proposes a pair only when the pair clearly beats every other partner for that letter, never contradicts the crib, and stops at ten plug pairs. Accept the pairs you agree with one by one, or click **Accept all**. You can change any pair afterwards on the sheet.

The scoring counts letters, pairs and triples of letters from the Navy messages the simulator comes with, half and half with general German from Theodor Fontane's *Effi Briest* (Project Gutenberg), written as the Navy wrote: ä as AE, ß as SZ, CH as Q, X for punctuation, no spaces.

### The right ring

The Bombe finds the rotor cores, not the ring settings. The **Right ring** decides when the middle rotor turns over. A wrong right ring garbles the message a letter at a time, once every 26 letters. Turn it with ◀ and ▶ (the core positions stay), or click **Find**. Find scores the decrypt with each of the 26 rings and sets the lowest ring with the best score. The bars show every ring's score, with the best ones highlighted. When several rings tie, the ring is not settled yet: find or accept more steckers, then click **Find** again. A good order is Find, Suggest, Find. The left and middle rings stay at Z until the indicators are read.

### Verdict and key

Mark the stop **True stop** or **False stop** (or **Unchecked** again). The verdict shows in the list of stops; after **False stop** the notebook goes back to it. It also tells you whether the crib matches. For an intercept or exercise, it says whether the stop really is the true one, which pairs are wrong or missing, and whether the right ring is right.

After **True stop**, the last step gives the key: the reflector, wheel order, rings, plugs and the message key: the rotor positions at the start of the message. **Set up Enigma** asks first, then sets up the Enigma with this key at the message key and switches the machine window to Enigma mode, ready to type the cipher text.
