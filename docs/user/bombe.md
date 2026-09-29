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
