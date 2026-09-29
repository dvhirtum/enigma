# The Bombe

[Back to the contents](README.md)

The Bombe was the electromechanical machine that Bletchley Park used to find the daily Enigma key. It tests a crib, a guessed piece of plaintext, against the cipher text at every rotor position and stops at the positions where the guess could be right.

## Switching modes

The title at the top left switches between the two modes. The active mode is in capitals; click the other one to switch. Each mode keeps its state while the other is shown. While an Enigma key is held down, the mode cannot be switched.

In Bombe mode, the book button opens these instructions.

## Loading a message

The **Message** tab loads the message to break:

- **Intercept**: a historical message, such as Scharnhorst's last signal. Choose it and click **Load intercept**.
- **New exercise**: a Navy message sent on a random day of one of your M3 key sheets. Generate or import M3 key sheets first.
- **Radio message or cipher text**: paste a Navy radio message, as the operator's notebook writes it, or bare cipher text, and click **Load pasted text**.

The tab shows the message as received, a hint for intercepts and exercises, and the cipher text the crib goes under, in groups of five. Loading a message removes the crib.

## Placing the crib

A crib is a piece of plaintext you expect in the message, such as `WETTERVORHERSAGE` (weather forecast). Type it on the **Crib** tab and click **Set crib**. Only letters count.

The crib strip shows the cipher text with the crib under it. The Enigma never encrypts a letter to itself, so where a crib letter sits under the same cipher letter, the crib cannot be at that position: a crash, marked in red. Slide the crib to a position without crashes:

- drag the crib sideways,
- or press Arrow Left and Right, Home and End (not while typing in the crib field),
- or click ◀ and ▶.

Under the strip you see the position and the number of crashes. **Place crib** places the crib at a position without crashes and builds the menu from it.

## The menu

The **Menu** tab shows the menu built from the placed crib. Each crib letter and the cipher letter above it form a link, numbered by its place in the crib. On the Bombe one scrambler joins the two letters, set that many steps from the first (1 = ZZA). The drawing shows every link of the crib:

- solid links are plugged up and tested,
- dashed red links are plugged up but not connected to the test register letter, so they test nothing,
- dotted grey links are not on the menu.

Loops (closures) make a menu good. At a wrong position, each loop lets the current through with a chance of about 1 in 26, so more loops mean fewer false stops. The summary counts the links, letters and loops connected to the test register letter, and estimates the false stops per wheel order with and without the diagonal board.

To change the menu:

- click a link in the drawing, or tick it in the **Links** list, to plug it in or out,
- click a letter on the menu to put the test register on it (the ringed letter),
- drag letters to tidy the drawing.

**Build menu** builds the menu again from the part of the crib with the fewest expected stops, with the test register on the letter with the most links.

## Running the Bombe

The **Front** tab shows the Bombe as the operators saw it: three banks of twelve scramblers, each with three drums (upper, middle, lower) standing for the Enigma's left, middle and right rotors. The drum rims are coloured by rotor, as on the real machine. The menu's links take the first scramblers, in order of their offset, and each is set that many steps from the others. The three drums on the right are the indicator drums: they read the position with the letters reversed, which is the ring setting to try on the Enigma.

Before you start:

- choose reflector **B** or **C**,
- tick the rotors the Bombe may use; it runs every order of three of them (all eight give 336 wheel orders),
- set the speed. At the left end the Bombe runs at its historical speed, a wheel order in about 20 minutes; further right it runs faster, and at the right end at full speed, which runs all wheel orders at once in seconds.

Click **Start**. The bar and the line under it show how far the run has got, the stops found and the time taken. You can change the speed while it runs, and **Stop** ends the run. The run goes on in the background when you switch tabs or modes.

At a set speed the drums turn with the run, and the Bombe halts at each stop, as the real one did. It shows the wheel order, the indicator reading, and the stecker partner of the test register letter. Click **Continue** to run on. At full speed the Bombe does not halt; it counts the stops.

## The back of the Bombe

The **Back** tab shows how the menu is plugged up. Each letter on the menu has a common, and each scrambler's two jacks are cabled to the commons of its link's letters. The commons are also cabled to the diagonal board, and the test register sits on the test register letter.

- **Diagonal board** switches Welchman's diagonal board on or off. It is on by default; without it a menu gives many more false stops.
- **Input on wire** sets the wire of the test register cable that the current goes into: the guessed stecker partner of the test register letter. It is A, or B when the test register is on A.

The run settings cannot change while the Bombe runs or waits at a stop.
