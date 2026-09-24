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
- `KeySheet`: id, network, month, `Provenance` (`Historical(source)` | `Generated` | `UserDefined`), and `DailyKey`s. The model follows from the keys; all keys are for the same model. Historical sheets are read-only.
- `DailyKey`: day, reflector, Walzenlage (rotor order, Greek rotor first on the M4), Ringstellung (ring settings), Steckerverbindungen (plug pairs), and optionally Kenngruppen (key identification groups). `SetUp()` creates a machine of its model with the key and all rotors at A.
- `KeySheetGenerator`: generates a full month. The inner setting (reflector, Walzenlage, rings) changes every other day, the plugs daily. Every Walzenlage includes one of VI–VIII. Each day has 10 plug pairs and 4 Kenngruppen, unique within the sheet.
- Milestone 8:
  - `Kenngruppenbuch` (indicator book)
  - `Doppelbuchstabentauschtafel` (bigram tables)
  - `MessageKey`: Grundstellung (basic setting) and Spruchschlüssel (message key)
  - encrypting and decrypting the indicator

### Application
- Machine commands: `CreateMachine`, `InsertRotor`, `RemoveRotor`, `SetRingSetting`, `SetReflector`, `ConnectPlug`, `DisconnectPlug`, `TurnRotor`, `PressKey`, `ReleaseKey`. Each returns the `MachineState`.
- Key-sheet commands: `ApplyDailyKey` (replaces the machine, switching model if needed), `CreateKeySheet`, `UpdateKeySheet`, `DeleteKeySheet`, `GenerateKeySheet`, `ImportKeySheet`.
- Queries: `GetMachineState`, `ListKeySheets`, `GetKeySheet`.
- Ports: `IMachineSessionStore` (the machine and the daily key applied to it), `IKeySheetRepository`.
- `MachineState.appliedKey`: the sheet, month and day last applied, `modified` once the reflector, rotor order, rings or plugs differ from it (turning rotors does not count). Switching model clears it.
- `KeySheetText`: daily keys as text, one row per day in Navy column order: day, reflector, rotors, rings (01–26), plugs, Kenngruppen. Create and update take this text; errors name the line.
- Key sheet files (JSON): `{ network, month, days: [{ day, reflector, rotors, rings, plugs, kenngruppen }] }`. Imports become user-defined.
- Commands and queries use plain handlers, without a mediator library.
- There is one machine. It starts as a default M3; `CreateMachine` replaces it.

### Infrastructure
- `JsonKeySheetRepository`: historical sheets are read-only in `data/keysheets/` (`KeySheets:HistoricalPath`; none are included yet). Generated and user-defined sheets are stored as one file each in app data (`KeySheets:UserPath`). Electron passes both paths.
- `InMemoryMachineSessionStore`: runs operations on the machine one at a time.

### Api
- ASP.NET Core minimal API. This is the composition root.
- Invariant violations are returned as 400 `ProblemDetails`, unknown key sheets as 404.
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
| POST | `/api/keysheets` | `{ network, month, text }` |
| PUT | `/api/keysheets/{id}` | `{ network, month, text }` |
| DELETE | `/api/keysheets/{id}` | |
| POST | `/api/keysheets/generate` | `{ model, network, month }` |
| POST | `/api/keysheets/import` | key sheet file |

## Frontend

- Electron Forge (Vite + TypeScript) with React. The machine state lives in a Zustand store.
- App frame: tabs for the views, the M3/M4 model switch (asks before it resets the machine), a machine summary, the applied daily key ("Key: Triton 1944-06, day 19", with "(modified)" after a setup change), a side panel button (an icon whose arrow points left to open the key sheet panel and right to close it), an error banner for rejected operations, and the backend version.
- SVG components: `RotorWindow`, `Thumbwheel`, `RotorDrum`, `Lamp`, `Key`, `PlugSocket`.
- Views:
  - **Top-down:**
    - rotor windows with thumbwheels (3 on the M3, 4 on the M4), turned with the thumbwheel, the mouse wheel or Arrow Up/Down
    - the lampboard (QWERTZUIO / ASDFGHJK / PYXCVBNML), lit while a key is held down
    - the keyboard, used with the mouse or the physical keyboard
  - **Open lid:** the machine seen from the front (reflector, rotors with their alphabet rings, entry wheel), above a rotor box with a compartment per rotor and a reflector box. Click a rotor in the box, then a slot, to insert or swap it. Click a rotor in the machine to return it to the box. The mouse wheel or Arrow Up/Down turns a machine rotor's position or a box rotor's ring. Click the spare reflector to fit it.
  - **Plugboard:** sockets in keyboard order. Drag a cable between two sockets, or pick two sockets in turn (mouse or Enter/Space). Click a plugged socket to remove its cable, or drag its plug to another socket or off the board.
- Panels:
  - message pad (4-letter groups)
  - key sheets: a side panel opened from the header. Choose, create, generate, import, export, edit (as text rows) and delete sheets. "Apply" on a day sets up the machine; for the other model it asks first. The applied day is marked.
  - operator mode (milestone 8)

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
docs/
.github/workflows/
```

## Milestones

1. Solution skeleton and CI
2. Machine domain with historical test vectors
3. Application and API
4. Electron shell
5. Top-down and open-lid views
6. Plugboard view
7. Key sheets: historical, generated, editor, apply daily key
8. Navy indicator procedure and operator mode

## Future work

- Officer keys (Offizier)
- Stichwort (keyword) procedure
- Bombe simulator
