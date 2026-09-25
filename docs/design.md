# Navy Enigma Simulator — Design

## Scope

- Kriegsmarine Enigma **M3** and **M4**, switchable.
- Historically exact wirings, stepping and plugboard.
- UI: top-down view of the machine; frontal view of the plugboard.
- Setup from key sheets (Schlüsseltafeln) and the Navy indicator procedure.

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
- `RadioMessage`: a preamble (time of origin `HHMM`, total letter count), the 2 indicator groups, the cipher text in groups of 4, and the indicator groups again. For example `1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI`.
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
- `MachineState.operator`: the procedure's direction, step, groups, indicator, Grundstellung, Spruchschlüssel, the pad (lamps lit while typing the message), the radio message and warnings. Applying a key or creating a machine ends the procedure. Sending needs an applied daily key.
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

- Electron Forge (Vite + TypeScript) with React. The machine state lives in a Zustand store.
- App frame: tabs for the views, the M3/M4 model switch (asks before it resets the machine), a machine summary, the applied daily key ("Key: Triton 1944-06, day 19 · Grundstellung QRS", with "(modified)" after a setup change), side panel buttons for key sheets and operator mode (one panel shows at a time; the key sheet icon's arrow points left to open and right to close), an error banner for rejected operations, and the backend version.
- SVG components: `RotorWindow`, `Thumbwheel`, `RotorDrum`, `Lamp`, `Key`, `PlugSocket`.
- Views:
  - **Top-down:**
    - rotor windows with thumbwheels (3 on the M3, 4 on the M4), turned with the thumbwheel, the mouse wheel or Arrow Up/Down
    - the lampboard (QWERTZUIO / ASDFGHJK / PYXCVBNML), lit while a key is held down
    - the keyboard, used with the mouse or the physical keyboard
  - **Open lid:** the machine seen from the front (reflector, rotors with their alphabet rings, entry wheel), above a rotor box with a compartment per rotor and a reflector box. Click a rotor in the box, then a slot, to insert or swap it. Click a rotor in the machine to return it to the box. The mouse wheel or Arrow Up/Down turns a machine rotor's position or a box rotor's ring. Click the spare reflector to fit it.
  - **Plugboard:** sockets in keyboard order. Drag a cable between two sockets, or pick two sockets in turn (mouse or Enter/Space). Click a plugged socket to remove its cable, or drag its plug to another socket or off the board.
  - **Instructions:** the user guide from `docs/user` (Markdown, rendered with react-markdown). Links between its pages open them in the tab.
- Panels:
  - key sheets: a side panel opened from the header. Choose (grouped by network, historical first), generate a year, import, export (compact JSON) and delete sheets. "Apply" on a day sets up the machine; for the other model it asks first. The applied day is marked. "Print to PDF" renders the export as typewritten A4 documents (`printSheet.ts`, with the Special Elite and Courier Prime fonts in `assets/fonts`): the Schlüsseltafel with the last day first, and optionally a second document, the same for every network, with the Zuteilungsliste, all columns (Spaltentafel), a trigram-to-column index (Suchtafel), the Tauschtafel calendar and the 9 tables as 26 × 26 grids. With both, the user picks a folder for the two PDFs. The main process prints them in a hidden window with scripts disabled.
  - operator mode: a side panel that walks through sending or receiving while the operator works the machine. Sending starts with picking the Schlüsselkenngruppe from the network's columns and the Verfahrenkenngruppe from theirs (or "Random"), and ends with the radio message and a Copy button. Receiving starts from a pasted radio message and a date (prefilled from the applied key, or today), lists the matching key sheet days to receive with (or receives with the applied key at once), and highlights the next cipher letter. Sending needs an applied daily key; the panel warns when the setup is modified. Its message pad shows the lamps in 4-letter groups.

## Testing

- **Backend:** xUnit.
  - `Enigma.Domain.Tests`, `Enigma.Application.Tests`, and `Enigma.Api.Tests` (using `WebApplicationFactory`).
  - Test names follow `Should_<expected>_When_<condition>`.
  - Tests mark `// Arrange`, `// Act` and `// Assert`.
  - Tests include historical vectors, such as the U-264 message.
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
data/keysheets/
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

## Future work

- Officer keys (Offizier)
- Stichwort (keyword) procedure
- Bombe simulator
