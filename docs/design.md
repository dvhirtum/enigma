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
| B | YRUHQLSDPXNGOKMIEBFZCWVJAT |
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
- The backend ships self-contained as an Electron Forge `extraResource`.

## Backend

### Domain: Machine
- Value objects: `Letter`, `Wiring`, `RingSetting`, `RotorPosition`, `PlugPair`, `MachineModel`.
- Catalog: `RotorType`, `ReflectorType`.
- Entities: `Rotor`, `Reflector`, `Plugboard`.
- Aggregate root `EnigmaMachine`:
  - Operations: `Create(model)`, `InsertRotors`, `SetReflector`, `SetRingSetting`, `ConnectPlug`, `DisconnectPlug`, `TurnRotor`, `PressKey → Letter`, `ReleaseKey`.
  - Invariants:
    - The rotor count matches the model.
    - Each rotor type is used at most once.
    - Beta and Gamma go only in the Greek slot, and only on the M4.
    - The M4 takes a thin reflector; the M3 takes B or C.
    - At most 13 plug pairs.
    - Only one key can be held down at a time.
  - Events: `RotorsStepped`, `LampLit`.
  - Switching model creates a new machine.

### Domain: Key Procedure
- `KeySheet`: id, network, month, `Provenance` (`Historical(source)` | `Generated` | `UserDefined`), and `DailyKey`s.
- `DailyKey`: date, Walzenlage (rotor order), Ringstellung (ring settings), Steckerverbindungen (plug pairs), and optionally Kenngruppen (key identification groups).
- `KeySheetGenerator`: generates sheets in Navy format.
- Milestone 2:
  - `Kenngruppenbuch` (indicator book)
  - `Doppelbuchstabentauschtafel` (bigram tables)
  - `MessageKey`: Grundstellung (basic setting) and Spruchschlüssel (message key)
  - encrypting and decrypting the indicator

### Application
- Commands: `CreateMachine`, `ConfigureMachine`, `ApplyDailyKey`, `PressKey`, `ReleaseKey`, `TurnRotor`, `CreateKeySheet`, `UpdateKeySheet`, `DeleteKeySheet`, `GenerateKeySheet`, `ImportKeySheet`.
- Queries: `GetMachineState`, `ListKeySheets`, `GetKeySheet`.
- Ports: `IKeySheetRepository`, `IMachineSessionStore`.
- Commands and queries use plain handlers, without a mediator library.

### Infrastructure
- `JsonKeySheetRepository`: historical sheets are read-only in `data/keysheets/`. Generated and user-defined sheets are stored in app data.
- `InMemoryMachineSessionStore`.

### Api
- ASP.NET Core minimal API. This is the composition root.
- Invariant violations are returned as `ProblemDetails`.

## Frontend

- Electron Forge (Vite + TypeScript) with React.
- SVG components: `RotorWindow`, `Thumbwheel`, `Lamp`, `Key`, `PlugSocket`.
- Views:
  - **Top-down:**
    - rotor windows with thumbwheels (3 on the M3, 4 on the M4)
    - the lampboard (QWERTZUIO / ASDFGHJK / PYXCVBNML), lit while a key is held down
    - the keyboard, used with the mouse or the physical keyboard
  - **Open lid:** insert and remove rotors, set the rings and choose the reflector.
  - **Plugboard:** drag cables between sockets.
- Panels:
  - message pad (4-letter groups)
  - key-sheet browser and editor, with "Apply daily key"
  - operator mode (milestone 2)

## Testing

- **Backend:** xUnit.
  - `Enigma.Domain.Tests`, `Enigma.Application.Tests`, and `Enigma.Api.Tests` (using `WebApplicationFactory`).
  - Test names follow `Should_<expected>_When_<condition>`.
  - Tests mark `// Arrange`, `// Act` and `// Assert`.
  - Tests include historical vectors, such as the U-264 message.
- **Frontend:** Vitest + React Testing Library, plus Playwright for end-to-end tests. They use plain JavaScript naming.
- **CI:** GitHub Actions runs all tests on every PR.

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
