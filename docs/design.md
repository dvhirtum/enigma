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
  - operator's notebook: a separate window (the renderer with `#notebook`) that walks through sending or receiving while the operator works the machine. It looks like squared paper: instructions are printed, and cipher material (groups, indicator, keys, cipher text, plaintext, radio message) is handwritten in Kalam (`assets/fonts`), one letter per square. The Encrypt and Decrypt tabs switch freely; while a message is in progress (not yet done), the other tab asks to finish or cancel it first. Sending starts with picking the Schlüsselkenngruppe from the network's columns and the Verfahrenkenngruppe from theirs (or "Random"), and ends with the radio message and a Copy button. Receiving starts from a pasted radio message and a date (prefilled from the applied key, or today), lists the matching key sheet days to receive with (or receives with the applied key at once), writes the plaintext under each cipher letter and circles the next one. Sending likewise writes the cipher text under each plaintext letter. The numbered steps run down the page, each with its instructions and handwriting; finished steps are ticked off and keep their contents, and the notebook scrolls to the current step. Letters typed in the notebook press the machine keys. Sending needs an applied daily key; the notebook warns when the setup is modified.
  - instructions: a separate window (the renderer with `#instructions`) with the user guide from `docs/user` (Markdown, rendered with react-markdown). Links between its pages open them in the window. Inline code and plain code blocks are handwritten in Kalam, code blocks one character per square so columns stay aligned; JSON blocks stay monospaced.

## Bombe

The three-rotor Turing-Welchman Bombe, as Hut 8 used it against Navy traffic.

- Cipher text: historical intercepts, pasted text and generated exercises. Intercepts and exercises give a hint, and a likely crib and the solution on request.
- Procedure: place a crib (crashes rejected), build a menu, run the Bombe, test the stops on the checking machine, recover the key (wheel order, rings, steckers), then decrypt the indicators with the bigram tables to read the day's other messages.
- Welchman's diagonal board can be switched on and off (on by default).
- Banburismus is explained in the user guide and Hut 8 mode, not simulated.
- The frame has a header with the mode switch and the instructions button, the error message and vertical tabs for the views (`TabbedViews`, shared with the Enigma frame). The Bombe job lives in the same Zustand store (`BombeSlice`) and loads when Bombe mode is first shown.
- Views:
  - **Message:** load a historical intercept (listed with its date), a new exercise, or pasted text (a radio message or bare cipher text). Shows the title, kind, hint, the transcript as received and the cipher text in groups of five.
  - **Crib:** type the crib (letters only, in capitals). The crib strip shows the cipher text with position numbers and the crib under it. Drag the crib, or use Arrow Left/Right, Home and End (anywhere in the view, except in a text field) or the ◀ ▶ buttons, to slide it; the covered cipher letters are shaded and crashes marked on both rows. **Place crib** (disabled on a crash) places it and builds the menu.
  - **Menu:** an SVG graph of every link of the placed crib, laid out by a force-directed layout (`menuLayout`, no library) that stays put while links change; letters can be dragged. Plugged links connected to the test register are solid, plugged but unconnected ones dashed red (also listed in a warning), the rest dotted grey; offsets label the links, and links between the same letters bow apart. Click a link, or tick it in the Links list (offset, letters, drum letters), to plug it in or out; the last link stays. Click a letter on the menu to put the test register on it (ringed); a link change keeps the test register while its letter stays on the menu, otherwise the backend chooses. The summary gives the connected links, letters and loops, and the estimated stops with and without the diagonal board. **Build menu** builds it automatically again.
  - **Front:** the reflector (B or C), rotor checkboxes (the wheel orders are every arrangement of three ticked rotors; at least three stay ticked), the speed slider (historical 14.6 positions/s up to a thousand times that, then full speed), Start, Stop, and the run's progress. The SVG shows three banks of twelve scramblers with three drums each (upper, middle, lower, rimmed in the rotor's colour); the menu's links take the first scramblers by offset and show their drum letters, the others are empty. The drums show the historical drum letters (ahead of the core positions by the rotor's offset) and the indicator drums read them reversed. The drums follow a paced run, stand at ZZZ otherwise, and spin at full speed. A run paused at a stop shows it (wheel order, indicator, core position, stecker) with **Continue**. Settings lock while the Bombe runs.
  - **Back:** the menu as plugged up: the diagonal board's 26 jacks, a common for each menu letter cabled to the board, each scrambler's two jacks cabled to their letters' commons, and the test register on its letter. The diagonal board switch and the input wire of the test register cable are set here.
  - **Stops:** the run's stops, 100 at a time with **Load more** (`stopPage`), and each stop's verdict. A row, or its Check button, opens the stop's check on the Checking view (the store keeps the selected view, `bombeView`). The stops and the check are cleared when the job changes or a new run starts.
  - **Checking:** the checking machine as an SVG in the style of the Hut 8 machine (black panel, spare drums in a rack, cream reflector wheel, three drums in their rotor colours with thumbwheels, 26 lamps, 26 keys; `CheckingMachine`). Keys, clicked or typed, light the lamp from the backend while held; thumbwheels turn the drum letters (queued). Below it: the crib at the stop (match, mismatch, unknown), a grid of 26 stecker partners (`steckers.ts`: a new partner removes both letters' old pairs), the right ring with ◀ ▶ and **Find** (26 score bars, the best highlighted, a note when rings tie), **Suggest** (pairs with their gain, Accept per pair or all), the decrypt, the verdict buttons with the confirmation, and the key with **Set up Enigma**, which asks inline, sets up the Enigma through `PUT /api/machine/key` at the message key and switches to Enigma mode.
- The run is polled while it runs (every 100 ms when paced, 250 ms at full speed), in either mode. The speed is kept in the store for the next run and sent to a running one.
- Tests: round-trip vectors (the true key stops) and vectors from primary sources.

### Domain: Bombe
- `WheelOrder`: three distinct rotors of I–VIII, left to right (upper, middle, lower drum); `All` lists the 336.
- `DrumPosition`: the core positions of the three drums (window letter minus ring setting). Offsets are written as the drum letters from ZZZ (1 = ZZA, 26 = ZAZ), and `Advance` turns each drum on its own, without carrying: every scrambler keeps its offset. `Indicator` reads the reversed letters of the indicator drums.
- `WheelOrder.DrumLetters`: the letters the drums show at core positions. The Bombe drums are ahead of the Enigma rotors: I, II, III, VI, VII and VIII by one letter, IV by two, V by three. A `BombeStop` gives its drum letters and indicator reading; the indicator plus the offsets gives the ring settings for windows ZZZ.
- `Scrambler`: a double-ended Enigma (rotors and reflector B or C, no plugboard) at a drum position, as a precomputed table.
- `Crib`: the guessed plain text. `CribPlacement`: a crib under the cipher text at a position. A crib letter under the same cipher letter is a crash. `Links` gives one link per crib letter, offsets counted from the crib start (1 = ZZA); a crashed placement has none. `All` gives every position.
- `MenuLink`: two crib letters and their offset. A letter never links to itself.
- `Menu`: 1–36 links (the 36 scramblers), one per offset, and the test register letter, which must be on the menu. `Loops` counts the closures of the part connected to the test register (links − letters + 1). `LoopsThrough(letter)` is the loops lost without that letter. `EstimatedStops(diagonalBoard)` estimates false stops per wheel order: 17,576 × (1 − e^−λ), with λ = 26^(1 − loops), times (600/676)^(letter pairs) with the diagonal board.
  - `Create(links)` puts the test register on the letter with the most links, then the most loops through it, then A–Z.
  - `Build(placement)` takes the connected part with the fewest estimated stops. Above 36 links it drops the links at chain ends first, then links on loops, the last offsets first.
- `BombeMachine`: a scrambler, a menu, the input letter and the diagonal board switch. Each letter has a cable of 26 wires; a link's scrambler joins wire x of one cable to wire scrambler(x) of the other, and the diagonal board joins wire b of cable a to wire a of cable b. `Test(position)` makes the input wire live, spreads the current and stops when not all 26 test register wires are live. `Run()` tests all 17,576 positions from ZZZ, the upper drum fastest; `PositionAt(step)` gives the position of each step.
- `BombeStop`: the wheel order, drum position, test register and live wires. `Stecker` is the only live wire, or the only dead one when 25 are live.
- `Steckers`: the steckers found while checking: each letter's partner, itself when unsteckered, or unknown ("AD ET RR"). A letter with another partner is refused. `Plugs` gives the cables.
- `StopCheck`: checking a stop on the Hut 8 checking machine: rotors and reflector without plugboard, set by the Bombe drum letters and not stepping (`Press`). It starts at the stop's drum letters with the stop's stecker. `Crib()` tells for each crib letter at the stop plus its offset whether the steckers match, mismatch or are unknown. The right ring (default Z) is turned with the core positions kept; left and middle stay Z. `Decrypt()` deciphers the whole message on a stepping Enigma from `MessageKey` (the windows that step to the crib's), null where a stecker is unknown. `Confirm(verdict, solution)` records the verdict and gives the crib mismatches and unknowns, and, when the message has a solution, whether the stop is the true one, whether the verdict is right, the wrong and missing pairs and whether the right ring is right. `Suggest()` proposes steckers for the unknown letters without setting them: greedily, one letter at a time, each partner (itself included) that keeps every crib link consistent gains the log likelihood, against random letters, of the decrypt letters it makes known; a letter's best partner is taken when it gains and beats the runner-up by `SuggestMargin`, up to ten plug pairs in all. `FindRightRing()` scores the decrypt with each of the 26 right rings (core positions kept) by its gain and sets the lowest best; rings that decrypt alike tie, and when no ring has a score all tie and the ring stays. It uses the current steckers, so Find, Suggest and Find again settles a ring the menu's steckers leave open.
- `LanguageModel`: the log probability of each letter after the two before it; `Gain` sums it against random letters (log 1/26) over the windows of three known letters. The probability is 0.6 × trigram + 0.3 × bigram + 0.1 × letter frequency (a context never seen falls back to the shorter one), each half Navy, half German. `LanguageCounts` is written by `scripts/LanguageTable.cs` (`dotnet run scripts/LanguageTable.cs`): Navy counts from the intercepts' plain texts and 400 exercise plain texts (`ExerciseGenerator.PlainText`, fixed seed), German counts from `data/corpus/effi-briest.txt` (Theodor Fontane, *Effi Briest*, Project Gutenberg eBook #5323), converted to Navy style: ä → AE, ö → OE, ü → UE, ß → SZ, CH → Q, digits spelled out, punctuation → X, no spaces.
- `MessageSource`: the message to break: kind (intercept, exercise, pasted), title, hint, transcript, the Navy `RadioMessage` when it is one, the cipher text, and for intercepts and exercises the likely crib and the `Solution` (reflector, wheel order, rings, plugs, message key, plain text, notes; exercises add the key sheet day and indicator). Pasted text is read as a radio message, or else as bare cipher text; text with digits must be a radio message.
- `Intercepts`: compiled in, each verified against its published key: Scharnhorst's last signal (26 Dec 1943, Navy M3), both parts of the Operation Barbarossa message (7 Jul 1941, Army Enigma I, Kenngruppe group left out of the cipher text) and Carter's weather crib.
- `ExerciseGenerator`: a Navy message from a template (weather forecast, nothing to report, own position, convoy), sent on an M3 key sheet day with the full procedure (Kenngruppen from the network's columns, bigram table, message key) at a random time. The template's phrase is the crib; it may follow a short prefix. The middle rotor may turn over under the crib.
- `BombeJob`: the message, crib, placement, menu and run settings: input letter (A, or B when the test register is A, unless set), diagonal board (on), reflector (B or C, default B) and wheel orders (all 336 by default). Loading a message clears the crib, placement and menu; a new crib clears the placement and menu. Placing the crib rejects crashes and builds the menu; a menu set by hand takes links of the placement only (either letter first).

### Application and API: Bombe
- `IBombeSessionStore` holds one job and its latest run (`InMemoryBombeSessionStore`).
- `BombeRun` runs the menu over the job's wheel orders in the background. The speed is in positions per second, or null for full speed. At full speed the wheel orders run in parallel (all 336 in about 3 s on 16 cores); at a set speed one runs at a time, paced by `TimeProvider`, and the progress shows the wheel order and drum position in hand. A paced run pauses at each stop (`Paused`, with the stop) until it is continued; it stays paused when set to full speed. `HistoricalSpeed` is a wheel order in 20 minutes (14.6 positions per second). The speed can change while the run goes.
- Changing the job is refused while the Bombe runs or is paused, and clears the stops of a finished run. There is one run at a time. A run that throws ends as `Failed` with its error.
- The menu state lists the plugged links, every link of the placed crib, the links connected to the test register, the loops and the estimated stops with and without the diagonal board.
- Stops are fetched from an index on, as a run with a poor menu can have hundreds of thousands. Each gives its index and the verdict of its check.
- The run keeps a `StopCheck` per stop, started when first asked for, until the run is replaced or cleared. Confirming compares with the solution of the message the run was started on. Suggest returns the proposed pairs with their gain, the steckers with them added (to accept through the PUT) and their decrypt; Find returns every ring's score, marks the best (more than one: not determined yet) and the check.
- `GenerateExercise` uses a random day of a random M3 key sheet (linked through `KeySheetLinker`), and is refused when there is none. The state shows the message's hint, never its crib or solution; unknown intercepts and asking a pasted message for them give 404.

| Method | Path | Body |
|---|---|---|
| GET | `/api/bombe` | |
| PUT | `/api/bombe/cipher-text` | `{ text }` (pasted; empty clears) |
| GET | `/api/bombe/intercepts` | |
| POST | `/api/bombe/source/intercept` | `{ id }` |
| POST | `/api/bombe/source/exercise` | |
| GET | `/api/bombe/source/crib` | |
| GET | `/api/bombe/source/solution` | |
| PUT | `/api/bombe/crib` | `{ crib }` |
| PUT | `/api/bombe/placement` | `{ position }` |
| PUT | `/api/bombe/menu` | `{ links, testRegister? }` |
| POST | `/api/bombe/menu/build` | |
| PUT | `/api/bombe/settings` | `{ input?, diagonalBoard?, reflector?, wheelOrders? }` (left out: unchanged; empty input: default) |
| POST | `/api/bombe/run` | `{ speed? }` |
| PUT | `/api/bombe/run/speed` | `{ speed? }` |
| POST | `/api/bombe/run/continue` | |
| DELETE | `/api/bombe/run` | |
| GET | `/api/bombe/run` | |
| GET | `/api/bombe/run/stops?from=&count=` | (count left out: all) |
| GET | `/api/bombe/run/stops/{stop}/check` | |
| PUT | `/api/bombe/run/stops/{stop}/check` | `{ position?, steckers?, rightRing? }` (left out: unchanged) |
| POST | `/api/bombe/run/stops/{stop}/check/press` | `{ key }` |
| POST | `/api/bombe/run/stops/{stop}/check/verdict` | `{ verdict }` (True, False or Unchecked) |
| POST | `/api/bombe/run/stops/{stop}/check/suggest` | |
| POST | `/api/bombe/run/stops/{stop}/check/find` | |

## Testing

- **Backend:** xUnit.
  - `Enigma.Domain.Tests`, `Enigma.Application.Tests`, and `Enigma.Api.Tests` (using `WebApplicationFactory`).
  - Test names follow `Should_<expected>_When_<condition>`.
  - Tests mark `// Arrange`, `// Act` and `// Assert`.
  - Tests include historical vectors, such as the U-264 message and Frank Carter's weather crib for the Bombe (exactly 2 stops with the diagonal board, as Carter reports; the true one at core positions VMB with G/Q, indicator DKX as Carter reads it). The bundled intercepts decrypt to their published plain text, and Barbarossa's message keys encrypt to the indicators in its preamble. Suggest finds Carter's I/K and O/X from the menu's steckers, and on a message whose middle rotor turns over before the crib, Find, Suggest and Find again recover the right ring and every stecker.
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
