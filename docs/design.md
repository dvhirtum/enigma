# Navy Enigma Simulator — Design

## 1. Goals

- Simulate the Kriegsmarine Enigma, both the **M3** and the **M4**, switchable at runtime.
- Use historically exact rotor and reflector wirings, stepping behaviour and plugboard.
- UI: a top-down view of a real machine (rotor windows, lampboard, keyboard). The plugboard is shown as a frontal view.
- Set up the machine the way a German operator would, working from key sheets (Schlüsseltafeln) and the Navy indicator procedure.

## 2. Historical scope

| Model | Rotor slots | Rotors | Reflector (UKW) |
|---|---|---|---|
| M3 | 3 | I–VIII | B, C |
| M4 | 4 (Greek slot + 3) | Greek slot: Beta, Gamma; others: I–VIII | B-thin, C-thin |

### Rotor catalog

The values below are to be verified against primary sources (Crypto Museum, Hamer/Sale/Sullivan) and backed by historical test vectors.

| Rotor | Wiring (A→Z) | Turnover notch(es) |
|---|---|---|
| I | EKMFLGDQVZNTOWYHXUSPAIBRCJ | Q |
| II | AJDKSIRUXBLHWTMCQGZNPYFVOE | E |
| III | BDFHJLCPRTXVZNYEIWGAKMUSQO | V |
| IV | ESOVPZJAYQUIRHXLNFTGKDCMWB | J |
| V | VZBRGITYUPSDNHLXAWMJQOFECK | Z |
| VI | JPGVOUMFYQBENHZRDKASXLICTW | Z, M |
| VII | NZJHGRCXMYSWBOUFAIVLPEKQDT | Z, M |
| VIII | FKQHTLXOCBJSPDZRAMEWNIUYGV | Z, M |
| Beta | LEYJVCNIXWPBQMDRTAKZGFUHOS | — (never steps) |
| Gamma | FSOKANUERHMBTIYCWLQPZXVGJD | — (never steps) |

| Reflector | Wiring |
|---|---|
| B | YRUHQLSDPXNGOKMIEBFZCWVJAT |
| C | FVPJIAOYEDRZXWGCTKUQSBNMHL |
| B-thin | ENKQAUYWJICOPBLMDXZVFTHRGS |
| C-thin | RDOBJNTKVEHMLFCWZAXGYIPSUQ |

### Behaviour that must be exact

- **Stepping:** rotors step *before* the electrical signal passes through them. The right rotor steps on every key press. Stepping follows the ratchet (pawl) mechanism, **including the double-step anomaly** of the middle rotor. The Greek rotor never steps.
- **Ring setting (Ringstellung)** applies to every rotor, including Beta and Gamma.
- **Plugboard (Steckerbrett):** 0–13 cables, and each letter can be in at most one pair. The Navy normally used 10.
- **M4 compatibility:** an M4 with B-thin + Beta at position A, ring A, behaves exactly like an M3 with reflector B. The same holds for C-thin + Gamma and reflector C. This is covered by a test.
- **Validation** against historical messages and published vectors, not only round trips. One example is the U-264 message (1942), broken in 2006 by the M4 Project.

## 3. Architecture overview

```
┌──────────────────────── Electron ────────────────────────┐
│  Renderer (React + TS, SVG)  ⇄  preload bridge  ⇄  Main  │
└──────────────────────────────────────────┬───────────────┘
                                           │ HTTP (localhost, random port)
┌──────────────────────── .NET 10 ─────────▼───────────────┐
│  Enigma.Api  →  Enigma.Infrastructure  →  Enigma.Application  →  Enigma.Domain │
└──────────────────────────────────────────────────────────┘
```

- The Electron **main** process starts `Enigma.Api` as a child process. The API binds to a free port on `127.0.0.1` and announces the port on stdout. The main process reads the port and passes the API URL to the renderer through the preload script. The renderer runs with `contextIsolation` on and `nodeIntegration` off.
- **All machine logic lives in the backend.** The frontend only renders state and sends user intents.
- A key press returns the lit lamp and the new rotor positions in a single response. localhost latency is low enough for real-time typing, so there is no SignalR or WebSocket.
- **Packaging:** the backend is published self-contained and bundled as an Electron Forge `extraResource`.

## 4. Backend (DDD + Clean Architecture)

Dependencies only point inward: Api → Infrastructure → Application → Domain. `Enigma.Domain` has no external dependencies.

### 4.1 Bounded context: Machine

**Value objects**
- `Letter`: A–Z. It cannot be constructed with an invalid value.
- `Wiring`: a permutation of 26 letters, with forward and inverse mapping.
- `RingSetting`, `RotorPosition`: letters (A–Z) that wrap around.
- `PlugPair`: two distinct letters.
- `MachineModel`: `M3` or `M4`.

**Catalog (domain knowledge)**
- `RotorType` (I–VIII, Beta, Gamma) and `ReflectorType` (B, C, B-thin, C-thin). These are static historical specifications: wiring, notches, and whether the part is thin or Greek.

**Entities**
- `Rotor`: type, ring setting and current position.
- `Reflector`.
- `Plugboard`: a set of `PlugPair`s.

**Aggregate root: `EnigmaMachine`**
- `Create(MachineModel)`
- `InsertRotors(...)`, `SetReflector(...)`, `SetRingSetting(slot, ...)`, `ConnectPlug(...)`, `DisconnectPlug(...)`
- `TurnRotor(slot, direction)`, the thumbwheel
- `PressKey(Letter) → Letter` (the lit lamp), then `ReleaseKey()`
- Invariants:
  - The rotor count matches the model.
  - No rotor type is used twice.
  - Beta and Gamma go only in the Greek slot, and only on the M4.
  - The M4 requires a thin reflector; the M3 requires B or C.
  - At most 13 plug pairs, and no letter in two pairs.
  - No key press while a key is already held down.
- Domain events: `RotorsStepped` and `LampLit`.
- Switching model means creating a new machine. The old configuration is discarded, just like picking up a different physical machine.

### 4.2 Bounded context: Key Procedure (Schlüsselverfahren)

- `KeySheet` (Schlüsseltafel): an identifier, a network name (for example Heimische Gewässer or Triton), a month, `Provenance` and a list of `DailyKey`s.
- `Provenance`: `Historical(source citation)`, `Generated` or `UserDefined`. The UI always shows it.
- `DailyKey`:
  - date
  - Walzenlage (reflector + rotor order)
  - Ringstellung (ring settings)
  - Steckerverbindungen (plug pairs)
  - optionally, the Kenngruppen (key identification groups)
- `KeySheetGenerator`: generates sheets in authentic Navy format that follow the historical rules. Those rules must be verified against sources before they are implemented.
- **Milestone 2:**
  - `Kenngruppenbuch` (indicator book)
  - bigram tables (`Doppelbuchstabentauschtafel`)
  - `MessageKey`: the Grundstellung (basic setting) and the Spruchschlüssel (message key)
  - the indicator encryption and decryption procedure

### 4.3 Application layer

Plain command and query handlers. No MediatR, which has been commercially licensed since 2025.

- Commands: `CreateMachine`, `ConfigureMachine`, `ApplyDailyKey(sheetId, date)`, `PressKey`, `ReleaseKey`, `TurnRotor`, `CreateKeySheet`, `UpdateKeySheet`, `DeleteKeySheet`, `GenerateKeySheet`, `ImportKeySheet`
- Queries: `GetMachineState`, `ListKeySheets`, `GetKeySheet`
- Ports: `IKeySheetRepository`, `IMachineSessionStore`

### 4.4 Infrastructure

- `JsonKeySheetRepository`:
  - Historical sheets ship read-only in `data/keysheets/`.
  - Generated and user-defined sheets are stored in the user's app-data folder.
- `InMemoryMachineSessionStore`.

### 4.5 Api

- ASP.NET Core minimal API. This is the composition root.
- DTOs map to Application commands and queries.
- Invariant violations become `ProblemDetails` error responses.

## 5. Frontend

- Electron Forge with its Vite + TypeScript template, and React in the renderer.
- The machine is drawn as SVG components, such as `<RotorWindow>`, `<Thumbwheel>`, `<Lamp>`, `<Key>` and `<PlugSocket>`.
- **Top-down view:**
  - Rotor windows with thumbwheels: 3 on the M3, 4 on the M4. Click or scroll to turn them.
  - The lampboard (QWERTZUIO / ASDFGHJK / PYXCVBNML). A lamp stays lit while its key is held down.
  - The keyboard, driven by the mouse or the physical keyboard.
- **Open-lid view:** remove and insert rotors, set the ring on the rotor itself, and change the reflector.
- **Plugboard view:** a frontal view where you drag cables between double sockets.
- **Side panels:**
  - A message pad showing the input and output in Navy 4-letter groups.
  - A key-sheet browser and editor, with an "Apply daily key" action.
  - Milestone 2: a guided **operator mode** for sending and receiving.

## 6. Testing

- **Backend: xUnit.**
  - `Enigma.Domain.Tests`: stepping, the double step, ring settings, the plugboard, invariants and historical vectors.
  - `Enigma.Application.Tests`: use cases with fake ports.
  - `Enigma.Api.Tests`: integration tests using `WebApplicationFactory`.
  - Test names follow `Should_<expected>_When_<condition>`, for example `Should_double_step_middle_rotor_When_middle_rotor_reaches_its_notch`. Every test has explicit `// Arrange`, `// Act` and `// Assert` comments.
- **Frontend:**
  - Vitest + React Testing Library for components.
  - Playwright (with its Electron support) for end-to-end tests.
  - Plain JavaScript naming conventions, for example `describe('Lampboard')` / `it('lights the lamp while the key is held down')`.
- **CI:** GitHub Actions runs `dotnet test` and the frontend tests on every PR.

## 7. Repository layout

```
enigma/
├─ src/backend/{Enigma.Domain, Enigma.Application, Enigma.Infrastructure, Enigma.Api}
├─ src/frontend/
├─ tests/{Enigma.Domain.Tests, Enigma.Application.Tests, Enigma.Api.Tests}
├─ data/keysheets/
├─ docs/
└─ .github/workflows/
```

## 8. Workflow

- All changes go on `feature/<topic>` branches and reach `main` through a PR.
- `main` allows only squash merges. Each merge replaces the default commit message with a custom one: `gh pr merge --squash --subject "..." --body "..."`.

## 9. Milestones

1. **Foundation:** solution skeleton and CI.
2. **Machine domain:** rotors, stepping, reflectors, plugboard, M3/M4 and historical test vectors.
3. **Application + API**.
4. **Electron shell:** starting the backend and the preload bridge.
5. **Top-down view** and open-lid view.
6. **Plugboard view**.
7. **Key sheets (milestone "a"):**
   - historical sheets with their sources
   - the generator
   - the editor
   - applying a daily key
8. **Navy indicator procedure (milestone "b"):**
   - the Kenngruppenbuch (indicator book)
   - bigram tables (Doppelbuchstabentauschtafel)
   - the Grundstellung (basic setting) and the Spruchschlüssel (message key)
   - guided operator mode

## 10. Future work

- **Officer keys (Offizier):** messages that were double-encrypted with a separate officer key sheet.
- **Stichwort (keyword) procedure:** deriving key settings from a keyword.
- Both fit into the Key Procedure context as extra `KeySheet` kinds and message procedures. The Machine context needs no changes.
- The README also mentions a **Bombe** simulator. It is out of scope for this design.
