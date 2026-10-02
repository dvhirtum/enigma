# Navy Enigma Simulator — Design

## Scope

- Kriegsmarine Enigma **M3** and **M4**, switchable.
- Historically exact wirings, stepping and plugboard.
- UI: top-down view of the machine; frontal view of the plugboard.
- Setup from key sheets (Schlüsseltafeln) and the Navy indicator procedure.
- A Bombe mode that breaks Enigma messages from a crib.

| Model | Slots | Rotors | Reflector |
|---|---|---|---|
| M3 | 3 | I–VIII | B, C |
| M4 | Greek + 3 | Greek: Beta, Gamma; others: I–VIII | B-thin, C-thin |

## Machine specification

Wirings to be verified against primary sources and historical test vectors.

| Rotor | Wiring (A→Z) | Notch(es) |
|---|---|---|
| I | EKMFLGDQVZNTOWYHXUSPAIBRCJ | Q |
| II | AJDKSIRUXBLHWTMCQGZNPYFVOE | E |
| III | BDFHJLCPRTXVZNYEIWGAKMUSQO | V |
| IV | ESOVPZJAYQUIRHXLNFTGKDCMWB | J |
| V | VZBRGITYUPSDNHLXAWMJQOFECK | Z |
| VI | JPGVOUMFYQBENHZRDKASXLICTW | Z, M |
| VII | NZJHGRCXMYSWBOUFAIVLPEKQDT | Z, M |
| VIII | FKQHTLXOCBJSPDZRAMEWNIUYGV | Z, M |
| Beta | LEYJVCNIXWPBQMDRTAKZGFUHOS | — |
| Gamma | FSOKANUERHMBTIYCWLQPZXVGJD | — |

| Reflector | Wiring |
|---|---|
| B | YRUHQSLDPXNGOKMIEBFZCWVJAT |
| C | FVPJIAOYEDRZXWGCTKUQSBNMHL |
| B-thin | ENKQAUYWJICOPBLMDXZVFTHRGS |
| C-thin | RDOBJNTKVEHMLFCWZAXGYIPSUQ |

Behaviour:
- Rotors step before encryption. The right rotor steps on every key press. The middle rotor double-steps. The Greek rotor never steps.
- Every rotor has a ring setting (Ringstellung), Beta and Gamma included.
- Plugboard: 0–13 pairs, each letter in at most one pair.
- An M4 with B-thin + Beta at A, ring A, equals an M3 with reflector B. The same holds for C-thin + Gamma and reflector C.

## Architecture

```
Electron: Renderer (React, SVG) ⇄ preload ⇄ Main
                                             │ HTTP 127.0.0.1:<random port>
.NET 10:  Api → Infrastructure → Application → Domain
```

- Electron main starts `Enigma.Api` as a child process. The API prints its port to stdout.
- The renderer runs with `contextIsolation` on and `nodeIntegration` off.
- All machine logic lives in the backend. The frontend renders state and sends user actions.
- A key press returns the lit lamp and the new rotor positions.
- The renderer calls the backend through IPC, one channel per operation (`machine:pressKey`, ...). Main forwards each call to the API over HTTP and returns `{ ok, value }` or `{ ok: false, problem }`.
- Windows stay in step: main sends the other windows each new machine state (`machine:state`), each Bombe call that changes the job, run or a check with its result (`bombe:result`), and key sheet changes. A window can ask the machine window to show a mode (`windows:mode`).
- Main supervises the API. If it stops, the renderer shows an error screen with a Restart button, which starts a fresh default M3.
- Hardening: a single instance, a Content Security Policy, no navigation, new windows, webviews or permissions.
- The backend ships as a Native AOT executable, as an Electron Forge `extraResource`.

## Backend

### Domain: Machine
- Value objects: `Letter`, `Wiring`, `RingSetting`, `RotorPosition`, `PlugPair`, `MachineModel`.
- Catalog: `RotorType`, `ReflectorType`.
- Entities: `Rotor`, `Reflector`, `Plugboard`.
- Aggregate root `EnigmaMachine`:
  - Operations: `Create(model)`, `InsertRotor`, `RemoveRotor`, `SetReflector`, `SetRingSetting`, `ConnectPlug`, `DisconnectPlug`, `TurnRotor`, `PressKey → Letter`, `ReleaseKey`.
  - Invariants:
    - Each slot holds at most one rotor. Typing needs every slot filled.
    - Each rotor type is used at most once.
    - Beta and Gamma go only in the Greek slot, and only on the M4.
    - The M4 takes a thin reflector; the M3 takes B or C.
    - At most 13 plug pairs.
    - Only one key can be held down at a time. While it is held, the machine cannot be changed.
  - Events: `RotorsStepped`, `LampLit`.
  - `Create(model)` fits I-II-III + B (M3) or Beta-I-II-III + B-thin (M4), rings and positions at A, no plugs.
  - Rotor box: I–VIII, plus Beta and Gamma on the M4. Each rotor keeps its own ring and position in or out of the machine.
  - `InsertRotor` puts a rotor from the box into a slot; a rotor already there goes back to the box. `RemoveRotor` lifts one rotor out. `SetRingSetting` works only on rotors in the box.
  - `TurnRotor` sets a rotor to a given window letter.
  - `MovePlug` moves one end of a cable to a free socket.
  - Switching model creates a new machine.

### Domain: Key Procedure
- `KeySheet`: id, network, month, `Provenance` (`Historical(source)` | `Generated` | `UserDefined`), the linked Kenngruppenbuch and Tauschtafel set, and `DailyKey`s. The model follows from the keys; all keys are for the same model. Historical sheets are read-only.
- `DailyKey`: day, reflector, Walzenlage (rotor order, Greek rotor first on the M4), Ringstellung (ring settings), Steckerverbindungen (plug pairs), and optionally the Grundstellung (3 letters on the M3, 4 on the M4). `SetUp()` creates a machine of its model with the key and all rotors at A.
- `KeySheetGenerator`: generates a full month for one network. The inner setting (reflector, Walzenlage, rings) changes every other day, the plugs and Grundstellung daily. Every Walzenlage includes one of VI–VIII. Each day has 10 plug pairs.
- `Kenngruppenbuch` (indicator book): all 17,576 trigrams, shuffled into 676 numbered columns of 26. The Zuteilungsliste allots columns 1–100 to the Verfahrenkenngruppen and 20 columns to each network: the historical Navy nets plus any added later. `Allot(network)` gives a new network the next 20 free columns.
- `Doppelbuchstabentauschtafel` (bigram table): a reciprocal swap of all 676 bigrams, without fixed points.
- `TauschtafelSet`: 9 tables for one year, with a calendar that gives each half month (days 1–15, 16–end) a table, cycling through the 9.
- `Indicator`: the Schlüsselkenngruppe with a filler letter in front, above the Verfahrenkenngruppe with a filler behind. The vertical bigrams are swapped with the table; the top row gives the first group, the bottom row the second.
- `MessageKey`: the Grundstellung and the Spruchschlüssel (message key). Typing the Verfahrenkenngruppe at the Grundstellung lights the Spruchschlüssel; the Greek rotor keeps its Grundstellung letter.
- `RadioMessage`: a preamble (time of origin `HHMM`, total letter count), the 2 indicator groups, the cipher text in groups of 4, and the indicator groups again. For example `1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI`. Parsing also takes a preamble without separators, as on a Red Form (`1925 21`).
- `OperatorProcedure`: the guided send or receive procedure.
  - Send: choose the groups and fillers → set the Grundstellung → type the Verfahrenkenngruppe → set the Spruchschlüssel → type the plaintext and fill the last group with X → the radio message.
  - Receive: decrypt the indicator; the Schlüsselkenngruppe names the key → set the Grundstellung → type the Verfahrenkenngruppe → set the Spruchschlüssel → type the cipher text → the plaintext.
  - Setting steps finish once the rotor windows show the setting. Keys other than the expected one are rejected, and so is any key outside a typing step. Turning a rotor while typing the Verfahrenkenngruppe goes back to setting the Grundstellung.
  - Receive warns when the letter count differs, the Schlüsselkenngruppe is not allotted to the network, or the Verfahrenkenngruppe is not a Verfahrenkenngruppe.

### Application
- Machine commands: `CreateMachine`, `InsertRotor`, `RemoveRotor`, `SetRingSetting`, `SetReflector`, `ConnectPlug`, `DisconnectPlug`, `TurnRotor`, `PressKey`, `ReleaseKey`. Each returns the `MachineState`.
- Key-sheet commands: `ApplyDailyKey` (replaces the machine, switching model if needed), `DeleteKeySheet`, `GenerateKeySheets` (every month of a year for each network of the Kenngruppenbuch; refused when generated sheets for that model and year exist), `ImportKeySheet`, `ExportKeySheet`.
- Operator commands: `StartSending`, `StartReceiving` (applies the chosen sheet's day first, or uses the applied key as it is), `ChooseGroups`, `FinishMessage`, `CancelOperator`. Each returns the `MachineState`.
- `FindReceivingKeys`: for a received message and a date, the sheets of that month whose network the Schlüsselkenngruppe (decrypted with each sheet's table for the date) is allotted to.
- Queries: `GetMachineState`, `ListKeySheets`, `GetKeySheet`, `GetKenngruppenbuch`, `GetTauschtafelSet`.
- Ports: `IMachineSessionStore` (the machine, the daily key applied to it and the operator procedure), `IKeySheetRepository`, `IKenngruppenbuchRepository`, `ITauschtafelSetRepository`.
- `KeySheetLinker`: links every sheet when it is saved or loaded. It links the newest Kenngruppenbuch, allotting columns to a new network (or generating a new book when none are free), and the Tauschtafel set for the sheet's year. Missing books and sets are generated. Days without a Grundstellung get a random one.
- `MachineState.operator`: the procedure's direction, step, groups, indicator, Grundstellung, Spruchschlüssel, the keys typed for the message and the pad (the lamps they lit), the radio message and warnings. Applying a key or creating a machine ends the procedure. Sending needs an applied daily key.
- `MachineState.appliedKey`: the sheet, month and day last applied, `modified` once the reflector, rotor order, rings or plugs differ from it (turning rotors does not count). Switching model clears it.
- Key sheet files (JSON): `{ network, month, days: [{ day, reflector, rotors, rings, plugs, grundstellung }], kenngruppenbuchId, tauschtafelSetId, kenngruppenbuch, tauschtafeln }`. Exports include the linked book and table set, so another installation receives with the same Kenngruppen and Tauschtafeln. Imports become user-defined; they store the book and set, adding allotments to a book that is already there. A clashing allotment, a book with other columns or a table set with other tables under the same id rejects the import. Files without a book or set are linked locally.
- Commands and queries use plain handlers, without a mediator library.
- There is one machine. It starts as a default M3; `CreateMachine` replaces it.

### Infrastructure
- `JsonKeySheetRepository`: historical sheets are read-only in `data/keysheets/` (`KeySheets:HistoricalPath`; none are included yet). Generated and user-defined sheets are stored as one file each in app data (`KeySheets:UserPath`). Electron passes both paths.
- `JsonKenngruppenbuchRepository` and `JsonTauschtafelSetRepository`: one file each in `procedure/books/` and `procedure/tables/` under the user path. The links and filled-in Grundstellungen of historical sheets are kept in `procedure/historical-links.json`.
- `InMemoryMachineSessionStore`: runs operations on the machine one at a time.

### Api
- ASP.NET Core minimal API. This is the composition root.
- Invariant violations are returned as 400 `ProblemDetails`, unknown key sheets, books and table sets as 404.
- Published with Native AOT. JSON uses source generation (`ApiJsonContext`).
- Ring settings are numbers 1–26. Positions, keys and lamps are letters.

| Method | Path | Body |
|---|---|---|
| GET | `/api/machine` | |
| POST | `/api/machine` | `{ model }` |
| PUT | `/api/machine/key` | `{ reflector, rotors, rings, plugs, positions }` (a new machine with the whole key, all or nothing) |
| PUT | `/api/machine/rotors/{slot}` | `{ rotor }` |
| DELETE | `/api/machine/rotors/{slot}` | |
| PUT | `/api/machine/rotors/{slot}/position` | `{ position }` |
| PUT | `/api/machine/rotor-box/{rotor}/ring` | `{ ringSetting }` |
| PUT | `/api/machine/reflector` | `{ reflector }` |
| POST | `/api/machine/plugs` | `{ pair }` |
| DELETE | `/api/machine/plugs/{letter}` | |
| PUT | `/api/machine/plugs/{letter}` | `{ to }` |
| POST | `/api/machine/keyboard/press` | `{ key }` |
| POST | `/api/machine/keyboard/release` | |
| DELETE | `/api/machine/lamps` | |
| POST | `/api/machine/daily-key` | `{ sheetId, day }` |
| GET | `/api/keysheets` | |
| GET | `/api/keysheets/{id}` | |
| DELETE | `/api/keysheets/{id}` | |
| POST | `/api/keysheets/generate` | `{ model, year }` |
| POST | `/api/keysheets/import` | key sheet file |
| GET | `/api/keysheets/{id}/export` | |
| GET | `/api/kenngruppenbuecher/{id}` | |
| GET | `/api/tauschtafeln/{id}` | |
| POST | `/api/operator/send` | |
| POST | `/api/operator/receiving-keys` | `{ message, date }` |
| POST | `/api/operator/receive` | `{ message, sheetId?, day? }` |
| PUT | `/api/operator/groups` | `{ schluesselkenngruppe, verfahrenkenngruppe, fillers }` |
| POST | `/api/operator/finish` | |
| DELETE | `/api/operator` | |

## Frontend

- Electron Forge (Vite + TypeScript) with React. The machine state lives in a Zustand store per window. The main process sends the machine state a window's call produces to the other windows.
- Modes: the header title switches between Enigma and Bombe (`mode.tsx`). The active mode is in capitals. Both frames stay mounted and the inactive one is hidden, so each keeps its state; only the active frame listens to the physical keyboard. The switch is disabled while an Enigma key is held down. The window title follows the mode.
- App frame: tabs for the views, the M3/M4 model switch (asks before it resets the machine), a machine summary, the applied daily key ("Key: Triton 1944-06, day 19 · Grundstellung QRS", with "(modified)" after a setup change), buttons that open the operator's notebook and instructions windows, a side panel button for key sheets (its arrow points left to open and right to close), an error message for rejected operations that floats under the header and fades out after 5 seconds (also in the notebook), and the backend version.
- SVG components: `RotorWindow`, `Thumbwheel`, `RotorDrum`, `Lamp`, `Key`, `PlugSocket`.
- Views:
  - **Top-down:**
    - rotor windows with thumbwheels (3 on the M3, 4 on the M4), turned with the thumbwheel, the mouse wheel or Arrow Up/Down
    - the lampboard (QWERTZUIO / ASDFGHJK / PYXCVBNML), lit while a key is held down
    - the keyboard, used with the mouse or the physical keyboard
  - **Open lid:** the machine seen from the front (reflector, rotors with their alphabet rings, entry wheel), above a rotor box with a compartment per rotor and a reflector box. Click a rotor in the box, then a slot, to insert or swap it. Click a rotor in the machine to return it to the box. The mouse wheel or Arrow Up/Down turns a machine rotor's position or a box rotor's ring. Click the spare reflector to fit it.
  - **Plugboard:** sockets in keyboard order. Drag a cable between two sockets, or pick two sockets in turn (mouse or Enter/Space). Click a plugged socket to remove its cable, or drag its plug to another socket or off the board.
- Panels:
  - key sheets: a side panel opened from the header. Choose (a month, grouped by year, then one of its sheets, grouped by machine, historical first), generate a year, import, export (compact JSON) and delete sheets. "Apply" on a day sets up the machine; for the other model it asks first. The applied day is marked. "Print to PDF" renders the export as typewritten A4 documents (`printSheet.ts`, with the Special Elite and Courier Prime fonts in `assets/fonts`): the Schlüsseltafel with the last day first, and optionally a second document, the same for every network, with the Zuteilungsliste, all columns (Spaltentafel), a trigram-to-column index (Suchtafel), the Tauschtafel calendar and the 9 tables as 26 × 26 grids. With both, the user picks a folder for the two PDFs. The main process prints them in a hidden window with scripts disabled.
  - operator's notebook: a separate window (the renderer with `#notebook`) that walks through sending or receiving while the operator works the machine, plus a **Lamps** tab with every lamp lit since it was cleared (`MachineState.lamps`, kept across machine setups, cleared with `DELETE /api/machine/lamps`). It looks like squared paper: instructions are printed, and cipher material (groups, indicator, keys, cipher text, plaintext, radio message) is handwritten in Kalam (`assets/fonts`), one letter per square. The Encrypt and Decrypt tabs switch freely; while a message is in progress (not yet done), the other tab asks to finish or cancel it first. Sending starts with picking the Schlüsselkenngruppe from the network's columns and the Verfahrenkenngruppe from theirs (or "Random"), and ends with the radio message and a Copy button. Receiving starts from a pasted radio message and a date (prefilled from the applied key, or today), lists the matching key sheet days to receive with (or receives with the applied key at once), writes the plaintext under each cipher letter and circles the next one. Sending likewise writes the cipher text under each plaintext letter. The numbered steps run down the page, each with its instructions and handwriting; finished steps are ticked off and keep their contents, and the notebook scrolls to the current step. Letters typed in the notebook press the machine keys. Sending needs an applied daily key; the notebook warns when the setup is modified.
  - instructions: a separate window (the renderer with `#instructions`) with the user guide from `docs/user` (Markdown, rendered with react-markdown). Links between its pages open them in the window. Inline code and plain code blocks are handwritten in Kalam, code blocks one character per square so columns stay aligned; JSON blocks stay monospaced.

## Bombe

The three-rotor Turing-Welchman Bombe, as Hut 8 used it against Navy traffic.

- Cipher text: historical intercepts, pasted text and generated exercises. Intercepts and exercises give a hint, and a likely crib and the solution on request.
- Procedure: place a crib (crashes rejected), build a menu, run the Bombe, test the stops on the checking machine, recover the key (wheel order, rings, steckers), then decrypt the indicators with the bigram tables to read the day's other messages.
- Welchman's diagonal board can be switched on and off (on by default).
- Banburismus is explained in the user guide and Hut 8 mode, not simulated.
- The machine window has a header with the mode switch, the instructions button and the Hut 8 notebook button, the error message and vertical tabs for the machine views (`TabbedViews`, shared with the Enigma frame). The Bombe and the checking machine are set up by hand. The message, crib, menu, stops and steckers are worked on paper or in the Hut 8 notebook window, which can set up the machines for its menu and stops. The Bombe job lives in the same Zustand store (`BombeSlice`) and loads when Bombe mode is first shown.
- Machine views:
  - **Front:** the machine and the printout. The SVG draws the historical machine: a wooden drum rack (I–VIII) above a black cabinet with three banks (chains) of twelve scramblers with three drums each (upper, middle, lower; painted in the rotor's colour with 26 marks and the letter under the index mark, a bare spindle when empty), each bank under a cream label plate with its chains and wheel order, and the letters each scrambler's jacks are cabled to. The cream indicator drums stand to the right of the second bank, and Start, Stop and Continue push buttons (shared with the Side) below them. Before a run, drums are fitted like plugboard cables (`usePlugDrag`): drag a rack drum onto a drum place, or pick it and click the place; it fills that row of the chain from scrambler 1 up to the place (`fitRow`). A click on a fitted drum, or dragging it off, takes it out; dragging it onto another place fits that row with its rotor. The mouse wheel or Arrow Up/Down turn a fitted drum's start letter. The drums show the historical drum letters and the indicator drums read the upper drums' letters reversed. The drums follow a paced run, stand at their start letters otherwise, and spin at full speed. The **Printout** lists the printed stops (chains, wheel order, indicator, test register, live wires with a dot per dead wire, stecker), 100 at a time with **Load more**, and **Clear printout**.
  - **Side:** the reason Start is disabled, the warnings (`machine.warnings`), the run's progress (chains and wheel orders, positions, stops, time, whether stops go to the notebook) and the right-hand end of the machine: the test register (stop lamp, register letter, 26 wire lamps, the stop's chains, wheel order and stecker) and the controls (`bombe/controls.tsx`): the diagonal board switch, a reflector selector switch (B or C), a speed knob (28.2 positions/s, as on a real Bombe, up to a thousand times that, then full speed; chosen at the end of a drag or key press), and Start, Stop and Continue push buttons. A run paused at a stop lights the stop lamp and the live wire lamps and enables Continue. Settings lock while the Bombe runs.
  - **Back:** a black cabinet with a group of vertical socket strips per chain: the 26 commons (A–Z, edged when the diagonal board is on), the two jacks of each of its 12 scramblers, and at the foot its test register socket and input wire dial, with heavy cables (plugs at both ends) from jacks and test registers to commons. Cables are plugged like the plugboard: drag between a jack (or test register) and a common of the same chain, or pick them in turn; a click on a plugged jack pulls its cable out, dragging its end moves it or pulls it out. A joined chain's test register is not shown. Toggle switches between the groups set the joins (chains 1–2, 2–3, drawn as a cable), and the input wire dial sets each group's input wire.
  - **Checking:** the checking machine, an SVG in the style of the Hut 8 machine (black panel, spare drums in a rack, cream reflector wheel, three drum places, drums with lettered faces, a ring in their rotor colours with a black dot at the ring letter, and thumbwheels, 26 lamps, 26 keys; `CheckingMachine`), with the reflector (B or C) and the stop the notebook set it up for. Drums are fitted like plugboard cables: drag from the rack to a place, or pick and click; a click on a fitted drum, or dragging it off, puts it back. Keys, clicked or typed, light the lamp from the backend while held, once all three drums are fitted (`useCheckKeys`, shared with the notebook; the press, and the release through `windows:releaseCheckerKey`, reach the other windows, so the lamp lights whichever window typed); thumbwheels turn the windows and dragging a ring (or Arrow Up/Down on it) sets it (queued). Setting the machine up for a stop, here or in the notebook, shows this view (the store keeps the selected view, `bombeView`).
- Hut 8 notebook: a separate window (the renderer with `#hut8`, `hut8/`) on the operator's notebook paper, with the codebreaker's workings in Kalam pencil. Numbered steps run down the page: the current step is worked, finished ones are ticked off with a short summary and a **Change** button that reopens them (**Keep as it is** closes it again, and a change closes it; the steps after it follow from the job), later ones show their title. The current step follows from the job and the open check: a message, a placed crib, a menu sent to the Bombe (marked in the window, or a run or stops), stops once the run has ended (or **Check the stops found so far**), an open check that is not false, a true verdict, **Read the indicators** clicked (or a pinch taken), the rings read. An intercept or bare cipher text ends at step 7 with a note (an intercept's published rings).
  1. **Choose the message:** a historical intercept (listed with its date), a new exercise, or pasted text (a radio message or bare cipher text). The summary writes the title, kind, hint and cipher text in groups of four.
  2. **Place the crib:** type the crib (letters only, in capitals). The cipher text is written in squares with position numbers and the crib on a slip under it. Drag the crib, or use Arrow Left/Right, Home and End (except in a text field) or the ◀ ▶ buttons, to slide it; the covered cipher letters are highlighted and crashes written in red, the crib letter struck through. **Place crib** (disabled on a crash) places it and builds the menu.
  3. **Draw the menu:** a pencil sketch (SVG, a displacement filter for the pencil line) of every link of the placed crib, laid out by a force-directed layout (`menuLayout`, no library) that stays put while links change; letters can be dragged. Plugged links connected to the test register are drawn firmly, plugged but unconnected ones dashed red (also listed in a warning), the rest faint and dotted; offsets label the links, and links between the same letters bow apart. Click a link, or tick it in the Links list (offset, letters, drum letters), to plug it in or out; the last link stays. Click a letter on the menu to put the test register on it (ringed in red); a link change keeps the test register while its letter stays on the menu, otherwise the backend chooses. The summary gives the connected links, letters and loops, and the estimated stops with and without the diagonal board. **Build menu again** builds it automatically; **Send the menu to the Bombe** plugs up the Bombe with the menu (asking first when it was plugged by hand) and moves on.
  4. **Run the Bombe:** points to the Front, Back and Side tabs, offers **Wheel orders already ruled out** for intercepts and exercises, follows the run (state, chains and wheel orders, positions, stops), and offers **Plug it up again** when the Bombe no longer matches the menu.
  5. **Choose a stop:** the stops logged while the notebook was open, 100 at a time with **Load more** (`stopPage`), each with its verdict, and **Clear stops**. A row, or its Check button, opens the stop's check. The stops and the check are forgotten when the backend has cleared them.
  6. **Check the stop:** sets up the checking machine for the stop (at once when it is empty or set up for another stop, after asking when it was set up by hand), the menu links by offset with their drum positions, the crib at the stop (match, mismatch, unknown), a read-only stecker sheet of 26 boxes with every partner written (`steckers.ts`), filled by the checking machine's lamps, contradicted letters and their partners in red with a note, a click on a box rubbing out its letter's pairs; letters typed in the notebook press the checking machine, the right ring with ◀ ▶ and **Find** (26 score bars, the best highlighted, a note when rings tie), the middle ring the same way, **Suggest** (pairs with their gain, Accept per pair or all), the decrypt and the verdict buttons with the confirmation. A false verdict goes back to the stops.
  7. **Read the message:** an editable stecker sheet (typing a partner replaces both letters' pairs, clearing a box rubs the letter out) with the pairs confirmed by checking highlighted and unknown letters shown faintly as unsteckered, the key and the plain text (unknown letters unsteckered), with **Set up Enigma**, which asks inline, sets up the Enigma through `PUT /api/machine/key` at the message key and shows Enigma mode in the machine window. **Read the indicators** moves on.
  8. **Read the indicators:** the pinch (an exercise's day, or for a pasted radio message a key sheet and day chosen) with its Grundstellung and Tauschtafel (a 26 × 26 grid in a details box), the broken message's indicator groups one above the other with boxes for the Schlüsselkenngruppe and Verfahrenkenngruppe (written once three letters are in, marked ✓ or ✗) and **Fill in**. Once the Verfahrenkenngruppe is right, the ring table: a 26 × 26 grid (left ring by row, middle by column) of the indicator readings of the cores at the crib, with the stop's indicator reading above it, and no mark on the matching square; a click reads those rings, and the step is done once the rings read lead to the stop's cores and the middle ring is among the best scored. The key shows the whole key, a warning when the square's indicator reading differs from the stop's, whether the rings are the key sheet's (with a solution), and the decrypt.
  9. **Read the day's traffic:** the whole key with the Grundstellung, **Set up Enigma at the Grundstellung** (asks inline, then shows Enigma mode), and the other messages of the day, each with its indicator boxes and **Fill in**. The messages are read on the Enigma by hand; the operator's notebook's Lamps tab records the lamps.
- The machine window polls the run while it runs (every 100 ms when paced, 250 ms at full speed), in either mode; the notebook follows the polled results. The speed is kept in the store for the next run and sent to a running one.
- Tests: round-trip vectors (the true key stops) and vectors from primary sources.

### Domain: Bombe
- `WheelOrder`: three distinct rotors of I–VIII, left to right (upper, middle, lower drum); `All` lists the 336.
- `BombeSetup`: the Bombe as set up by hand: three chains (`ChainSetup`) of 12 scramblers (`ScramblerSetup`: the letters its two jacks are cabled to, the rotor of each drum, its start letters, ZZZ at first), each chain with its test register letter and input wire (A, or B when the test register is on A, unless set), and the joins between chains. `Groups` gives the joined chains, with the first chain's test register and the first wheel order found. `Plug` cables a jack; `FitRow(chain, row, upTo, rotor)` fits scramblers 1 to upTo + 1 of a row and empties the rest of it (a rotor in one row per chain); `RemoveDrum` takes one drum out; `PlugTestRegister` and `SetInput` are refused on a joined-in chain; `Join` unplugs the joined chain's test register. `PlugUp(menu)` plugs a menu once per copy (`Menu.ChainsPerCopy`, joined chains for a longer one), its links in order, set to their offsets, with the test register on the menu's; each copy's chains take the rows of its first chain, fitted on exactly the cabled scramblers. `PluggedMenu` is the menu last plugged up, until a cable, test register, join or start letter changes. `Machines(reflector, diagonalBoard)` gives a `BombeMachine` per group with a test register and at least one scrambler cabled at both jacks with all three drums, from those scramblers; other groups are left out (refused when no group is left). `Warnings()` lists, per chain, scramblers with one jack cabled, cabled without all drums, or with drums but no cables (as ranges, e.g. 1–12), cabled chains without a test register, and chains with a test register but no working scrambler (the run leaves them out).
- `DrumPosition`: the core positions of the three drums (window letter minus ring setting). Offsets are written as the drum letters from ZZZ (1 = ZZA, 26 = ZAZ), and `Advance` (by an offset or by start letters, Z counting as 0) turns each drum on its own, without carrying: every scrambler keeps its offset. `Indicator` reads the reversed letters of the indicator drums.
- `WheelOrder.DrumLetters`: the letters the drums show at core positions. The Bombe drums are ahead of the Enigma rotors: I, II, III, VI, VII and VIII by one letter, IV by two, V by three. A `BombeStop` gives its drum letters and indicator reading; the indicator plus the offsets gives the ring settings for windows ZZZ.
- `Scrambler`: a double-ended Enigma (rotors and reflector B or C, no plugboard) at a drum position, as a precomputed table.
- `Crib`: the guessed plain text. `CribPlacement`: a crib under the cipher text at a position. A crib letter under the same cipher letter is a crash. `Links` gives one link per crib letter, offsets counted from the crib start (1 = ZZA); a crashed placement has none. `All` gives every position.
- `MenuLink`: two crib letters and their offset. A letter never links to itself.
- `Menu`: 1–36 links (three chains of 12 scramblers), one per offset, and the test register letter, which must be on the menu. `Loops` counts the closures of the part connected to the test register (links − letters + 1). `LoopsThrough(letter)` is the loops lost without that letter. `EstimatedStops(diagonalBoard)` estimates false stops per wheel order: 17,576 × (1 − e^−λ), with λ = 26^(1 − loops), times (600/676)^(letter pairs) with the diagonal board.
  - `Create(links)` puts the test register on the letter with the most links, then the most loops through it, then A–Z.
  - `Build(placement)` takes the connected part with the fewest estimated stops, on one chain: above 12 links it drops the links at chain ends first, then links on loops, each time the one whose loss leaves the fewest estimated stops (the lowest offset on a tie; for Carter's crib S–W, as on Virtual Colossus).
  - `ChainsPerCopy` is a chain per 12 links; `Copies` is the copies that fit on the three chains (3, 1 or 1).
- `BombeMachine`: `CabledScrambler`s (two letters, a `Scrambler` of their own wheel order and their start letters), the test register letter, the input letter and the diagonal board switch; or a menu with one scrambler and the start letters (by default the link offsets). Each letter has a cable of 26 wires; a scrambler joins wire x of one cable to wire scrambler(x) of the other, and the diagonal board joins wire b of cable a to wire a of cable b. `LiveWiresAt(drumLetters)` turns each scrambler that far on from its start, makes the input wire live, spreads the current and gives the live test register wires, or null when all 26 are live. For a menu, `Test(position)` does the same at core positions and `Run()` tests all 17,576 positions with the upper drums from ZZZ, the upper drum fastest; `PositionAt(step)` gives the upper drums' letters at each step.
- `BombeStop`: the wheel order, drum position, test register and live wires. `Stecker` is the only live wire, or the only dead one when 25 are live (`PartnerOf`). `PrintedStop`: a stop as printed: the chains, their wheel order (null when a row is empty), the upper drums' letters, the test register and live wires, with the indicator and stecker.
- `CheckingMachine`: the Hut 8 checking machine: reflector (B or C), three drums (a rotor on one drum only) with Bombe drum letters, ring and window letters (the drum letters are the windows less the rings), without plugboard and not stepping (`Press`, refused until all drums are fitted). `SetUp(stop, found, reflector)` fits the stop's wheel order and reflector, with the rings at its indicator and the windows at ZZZ (the stop's drum letters), so each menu link is checked at its menu position (ZZA, ZZB, ...); `Stop` remembers the stop until the drums or reflector change.
- `Steckers`: the steckers found while checking: each letter's partner, itself when unsteckered, or unknown ("AD ET RR"). A letter with another partner is refused. `Plugs` gives the cables.
- `SteckerSheet`: the pairs written while checking, contradictions and all ("AD EP EX RR"). `Contradicted` gives the letters with more than one partner; `Steckers` keeps the pairs whose letters both have one partner; `Without(letter)` rubs out a letter's pairs.
- `StopCheck`: checking a stop, worked on the checking machine. Its `Sheet` starts with the stop's stecker; `Steckers` is what the sheet gives. `Record(core, key, lamp)` writes a lamp: at the crib link whose position is `core`, when the key is a partner written for one of its letters, the lamp is written as a partner of the other, contradiction or not. `Crib()` tells for each crib letter at the stop plus its offset whether the steckers match, mismatch or are unknown. The right and middle rings (default Z) are turned with the core positions kept; the left stays Z. `Decrypt()` deciphers the whole message on a stepping Enigma from `MessageKey` (the windows that step to the crib's), taking unknown letters as unsteckered. `Confirm(verdict, solution)` records the verdict (a true verdict keeps the steckers as `Checked`) and gives the crib mismatches and unknowns, and, when the message has a solution, whether the stop is the true one, whether the verdict is right, the wrong and missing pairs and whether the right ring is right. `Suggest()` proposes steckers for the letters not on the sheet without setting them: greedily, one letter at a time, each partner (itself included) that keeps every crib link consistent gains the log likelihood, against random letters, of the decrypt letters it makes known; a letter's best partner is taken when it gains and beats the runner-up by `SuggestMargin`, up to ten plug pairs in all. `FindRightRing()` scores the decrypt with each of the 26 right rings (core positions kept, unknown letters unsteckered) by its gain and sets the lowest best; rings that decrypt alike tie, and when the message is too short to score all tie and the ring stays. It uses the current steckers, so Find, Suggest and Find again settles a ring the menu's steckers leave open. `FindMiddleRing()` does the same for the middle ring with the right ring kept, which only changes the decrypt where the left rotor turns over; `MiddleRingScores()` scores without setting. `RingTable(grundstellung, verfahrenkenngruppe)` gives the 676 left and middle rings, each with the Spruchschlüssel the Verfahrenkenngruppe gives at the Grundstellung on an Enigma with the check's key, and the cores that Spruchschlüssel steps to at the crib; the row with the stop's cores has the rings. `Reading` holds the rings read off it; `ReadKey` is then the whole key with the row's Spruchschlüssel as message key, and `ReadDecrypt()` the message on it. The reading's state says whether its middle ring is among the best scored.
- `LanguageModel`: the log probability of each letter after the two before it; `Gain` sums it against random letters (log 1/26) over the windows of three known letters. The probability is 0.6 × trigram + 0.3 × bigram + 0.1 × letter frequency (a context never seen falls back to the shorter one), each half Navy, half German. `LanguageCounts` is written by `scripts/LanguageTable.cs` (`dotnet run scripts/LanguageTable.cs`): Navy counts from the intercepts' plain texts and 400 exercise plain texts (`ExerciseGenerator.PlainText`, fixed seed), German counts from `data/corpus/effi-briest.txt` (Theodor Fontane, *Effi Briest*, Project Gutenberg eBook #5323), converted to Navy style: ä → AE, ö → OE, ü → UE, ß → SZ, CH → Q, digits spelled out, punctuation → X, no spaces.
- `MessageSource`: the message to break: kind (intercept, exercise, pasted), title, hint, transcript, the Navy `RadioMessage` when it is one, the cipher text, and for intercepts and exercises the likely crib, the `Solution` (reflector, wheel order, rings, plugs, message key, plain text, notes; exercises add the key sheet day and indicator) and three wheel orders in random order, one of them the key's (`WheelOrder.Hint`: the others follow the key's rules: rotors I–V for Army intercepts, rotor I–V on the right for exercises). The job shows them on request (`ShowWheelOrders`) until another message is loaded. Pasted text is read as a radio message, or else as bare cipher text; text with digits must be a radio message.
- `Intercepts`: compiled in, each verified against its published key: Scharnhorst's last signal (26 Dec 1943, Navy M3), both parts of the Operation Barbarossa message (7 Jul 1941, Army Enigma I, Kenngruppe group left out of the cipher text) and Carter's weather crib.
- `ExerciseGenerator`: a Navy message from a template (weather forecast, nothing to report, own position, convoy), sent on an M3 key sheet day with the full procedure (Kenngruppen from the network's columns, bigram table, message key) at a random time. The template's phrase is the crib; it may follow a short prefix. `Suits` takes only days whose right rotor has one notch (I–V); the message key is drawn again, up to `MaxAttempts` times, until the middle rotor does not turn over under the crib. `DayTraffic` sends 3–5 other messages on the same day, from these templates and three without a crib (rendezvous order, mine warning, air attack report), in order of time of origin.
- `Pinch`: what a pinch of a key sheet day gives: its Grundstellung and the bigram table in force. `DayTraffic`: the broken radio message and the day's other messages, each with the Schlüsselkenngruppe and Verfahrenkenngruppe written down from its indicator (`Write`, or `FillIn` from the table); `WrittenVerfahrenkenngruppe` refuses a missing or wrong one.
- `BombeJob`: the message, crib, placement, menu, run settings (diagonal board: on; reflector: B or C, default B), the Bombe (`Machine`, a `BombeSetup`) and the checking machine (`Checker`). Loading a message clears the crib, placement and menu; a new crib clears the placement and menu; none of them change the machines. Placing the crib rejects crashes and builds the menu; a menu set by hand takes links of the placement only (either letter first). `PlugUpMenu` plugs up the Bombe with the menu. `TakePinch` reads the loaded radio message with a pinch and the day's other messages (`Traffic`), refused for bare cipher text; loading a message clears it.

### Application and API: Bombe
- `IBombeSessionStore` holds one job, its latest run, the `StopLog` and the `Printout` (`InMemoryBombeSessionStore`).
- `BombeRun` turns the drums once through all 17,576 positions in the background and tests every group of chains with a test register at each one. The speed is in positions per second, or null for full speed (the groups in parallel). At a set speed the run is paced by `TimeProvider` and the progress shows the upper drums' letters. A paced run pauses at each stop (`Paused`, with the printed stop) until it is continued; it stays paused when set to full speed. `HistoricalSpeed` is a run without stops in 10.4 minutes (28.2 positions per second). The speed can change while the run goes. Every stop is printed; when started for the notebook (`notebook`: the main process sends whether the Hut 8 notebook window is open) and a crib is placed with the Bombe plugged up with the job's menu, the stops of groups with a wheel order also go to the `StopLog` (`Logged`). Clearing the stops makes the checking machine forget its stop.
- `StopLog` keeps the stops logged for the notebook, each with its reflector, placement and solution, and a `StopCheck` per stop, started when first asked for. Changing the message, crib or menu clears it, and so does `DELETE /api/bombe/stops`. `Printout` keeps the printed stops until `DELETE /api/bombe/printout`.
- Changing the job is refused while the Bombe runs or is paused, and drops the finished run. There is one run at a time. A run that throws ends as `Failed` with its error.
- The menu state lists the plugged links, every link of the placed crib, the links connected to the test register, the loops and the estimated stops with and without the diagonal board. The machine state gives each chain (test register, input, scramblers with jacks, drums and start), the joins, whether it is plugged up with the job's menu (`pluggedForMenu`), whether it was plugged by hand (`pluggedByHand`) and the warnings; the checker state gives the checking machine and the stop it was set up for.
- Stops are fetched from an index on, as a run with a poor menu can have hundreds of thousands. Each gives its index and the verdict of its check.
- Confirming a check compares with the solution of the message the stop was found on. Suggest returns the proposed pairs with their gain, the steckers with them added (to accept through the PUT) and their decrypt; Find returns every ring's score, marks the best (more than one: not determined yet) and the check.
- `GenerateExercise` uses a random day, with rotor I–V on the right, of the M3 key sheets (linked through `KeySheetLinker`), and is refused when there is none. The state shows the message's hint, never its crib or solution; unknown intercepts and asking a pasted message for them give 404.
- `TakePinch` takes an exercise's own key sheet day, or for a pasted radio message the sheet and day given; intercepts are refused. The state then has `day`: the pinch (sheet, network, month, day, Grundstellung, table number and swaps) and the messages, the broken one first, with the groups written down and whether each is right. The ring table needs the broken message's Verfahrenkenngruppe written down right. Reading the rings gives the check a `reading`: the rings, the whole key, its decrypt and, with a solution, whether the rings are right.

| Method | Path | Body |
|---|---|---|
| GET | `/api/bombe` | |
| PUT | `/api/bombe/cipher-text` | `{ text }` (pasted; empty clears) |
| GET | `/api/bombe/intercepts` | |
| POST | `/api/bombe/source/intercept` | `{ id }` |
| POST | `/api/bombe/source/exercise` | |
| GET | `/api/bombe/source/crib` | |
| GET | `/api/bombe/source/solution` | |
| POST | `/api/bombe/source/wheel-orders` | |
| PUT | `/api/bombe/crib` | `{ crib }` |
| PUT | `/api/bombe/placement` | `{ position }` |
| PUT | `/api/bombe/menu` | `{ links, testRegister? }` |
| POST | `/api/bombe/menu/build` | |
| PUT | `/api/bombe/settings` | `{ diagonalBoard?, reflector? }` (left out: unchanged) |
| POST | `/api/bombe/machine/plug-up` | |
| PUT | `/api/bombe/machine/chains/{chain}/scramblers/{scrambler}/jacks/{jack}` | `{ letter }` (empty: unplug) |
| PUT | `/api/bombe/machine/chains/{chain}/rows/{row}` | `{ rotor, upTo }` |
| DELETE | `/api/bombe/machine/chains/{chain}/scramblers/{scrambler}/drums/{row}` | |
| PUT | `/api/bombe/machine/chains/{chain}/scramblers/{scrambler}/start` | `{ start }` (e.g. `ZZB`) |
| PUT | `/api/bombe/machine/chains/{chain}/test-register` | `{ letter?, input? }` (left out: unchanged; empty letter: unplug; empty input: default) |
| PUT | `/api/bombe/machine/joins/{join}` | `{ joined }` |
| POST | `/api/bombe/run` | `{ speed?, notebook }` |
| PUT | `/api/bombe/run/speed` | `{ speed? }` |
| POST | `/api/bombe/run/continue` | |
| DELETE | `/api/bombe/run` | |
| GET | `/api/bombe/run` | |
| GET | `/api/bombe/stops?from=&count=` | (count left out: all) |
| DELETE | `/api/bombe/stops` | |
| GET | `/api/bombe/printout?from=&count=` | (count left out: all) |
| DELETE | `/api/bombe/printout` | |
| PUT | `/api/bombe/checking` | `{ reflector?, drums?, rings?, windows? }` (left out: unchanged; drums e.g. `["II", null, "III"]`) |
| POST | `/api/bombe/checking/press` | `{ key }` (gives the lamp and, when set up for a stop, its check with the lamp recorded) |
| POST | `/api/bombe/stops/{stop}/checking` | |
| GET | `/api/bombe/stops/{stop}/check` | |
| PUT | `/api/bombe/stops/{stop}/check` | `{ steckers?, rightRing?, middleRing? }` (left out: unchanged; steckers: the sheet, which may contradict itself) |
| POST | `/api/bombe/stops/{stop}/check/verdict` | `{ verdict }` (True, False or Unchecked) |
| POST | `/api/bombe/stops/{stop}/check/suggest` | |
| POST | `/api/bombe/stops/{stop}/check/find` | |
| POST | `/api/bombe/stops/{stop}/check/find-middle` | |
| GET | `/api/bombe/stops/{stop}/check/ring-table` | |
| PUT | `/api/bombe/stops/{stop}/check/rings` | `{ left, middle }` (1–26; both left out: forget) |
| POST | `/api/bombe/pinch` | `{ sheetId?, day? }` (pasted radio messages only) |
| PUT | `/api/bombe/day/messages/{message}/indicator` | `{ schluesselkenngruppe?, verfahrenkenngruppe? }` (left out: unchanged; empty: rubbed out; 0 = the broken message) |
| POST | `/api/bombe/day/messages/{message}/indicator/fill-in` | |

## Testing

- **Backend:** xUnit.
  - `Enigma.Domain.Tests`, `Enigma.Application.Tests`, and `Enigma.Api.Tests` (using `WebApplicationFactory`).
  - Test names follow `Should_<expected>_When_<condition>`.
  - Tests mark `// Arrange`, `// Act` and `// Assert`.
  - Tests include historical vectors, such as the U-264 message and Frank Carter's weather crib for the Bombe (exactly 2 stops with the diagonal board, as Carter reports; the true one at core positions VMB with G/Q, indicator DKX as Carter reads it). The bundled intercepts decrypt to their published plain text, and Barbarossa's message keys encrypt to the indicators in its preamble. Suggest finds Carter's I/K and O/X from the menu's steckers, and on a message whose middle rotor turns over before the crib, Find, Suggest and Find again recover the right ring and every stecker; on a message whose left rotor turns over, Find recovers the middle ring.
- **Frontend:** Vitest + React Testing Library, plus Playwright for end-to-end tests. They use plain JavaScript naming.
- **CI:** GitHub Actions runs on every PR and every push to `main`.

## Build and release

- GitVersion (GitHubFlow, Conventional Commits) sets the version.
- CI builds the app, runs all tests and static analysis (the .NET analyzers with warnings as errors, ESLint, and vulnerability checks for NuGet and npm), and packages the app with `npm run make`.
- Packaging runs as a matrix over operating systems. Windows only for now: a Squirrel installer (`Setup.exe`).
- Every push to `main` creates a GitHub release `v<version>` with the packaged app.
- Artifacts from `main` are kept for 7 days. PR artifacts are deleted when the PR closes.

## Repository layout

```
src/backend/{Enigma.Domain, Enigma.Application, Enigma.Infrastructure, Enigma.Api}
src/frontend/
tests/{Enigma.Domain.Tests, Enigma.Application.Tests, Enigma.Api.Tests}
data/{keysheets/, corpus/}
scripts/
docs/{design.md, user/}
.github/workflows/
```

## Milestones

1. Solution skeleton and CI
2. Machine domain with historical test vectors
3. Application and API
4. Electron shell
5. Top-down and open-lid views
6. Plugboard view
7. Key sheets: historical, generated, apply daily key
8. Navy indicator procedure and operator mode
9. Bombe: mode switch; scrambler and diagonal board; crib and menu; runs; crib, menu and Bombe views; stops and checking; indicators; Hut 8 walkthrough

## Future work

- Officer keys (Offizier)
- Stichwort (keyword) procedure
- Four-rotor Bombe (M4)
