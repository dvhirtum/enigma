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
- or click the strip and use Arrow Left and Right, Home and End,
- or click ◀ and ▶.

Under the strip you see the position and the number of crashes. **Place crib** places the crib at a position without crashes and builds the menu from it.
