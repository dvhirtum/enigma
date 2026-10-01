# Enigma

A simulator of the Kriegsmarine Enigma M3 and M4, with historically exact wirings, and of the Turing-Welchman Bombe used at Bletchley Park to break it. It is an Electron desktop app with a C# backend.

- **Enigma mode:** set the machine up from key sheets and send and receive messages, following the German Navy procedures.
- **Bombe mode:** break a message the way Hut 8 did. The Hut 8 notebook takes you from a crib to a menu, then to the stops and the key. The machine window shows the Bombe's front, side and back, with drums to fit and cables to plug, and the checking machine. Messages come from historical intercepts, generated exercises or pasted text.

See the [user guide](docs/user/README.md) for how to use it, and [docs/design.md](docs/design.md) for the design.

## Resources

- [Turing-Welchman Bombe rebuild project](https://bombe.org.uk/): the rebuilt Bombe at The National Museum of Computing. Its [Bombe description](https://bombe.org.uk/bombe-description/) gives the Bombe's speed.
- [Virtual Turing-Welchman Bombe](https://bombe.virtualcolossus.co.uk/) by Virtual Colossus. Its [technical page](https://bombe.virtualcolossus.co.uk/technical.html) gives the drum letter offsets.
- Frank Carter, [The Turing bombe in Bletchley Park](https://www.rutherfordjournal.org/article030108.html), Rutherford Journal 3: the source of Carter's weather crib.
- Frode Weierud, [Scharnhorst's Last Message?](https://cryptocellar.org/bgac/scharnhorst.html) on [CryptoCellar](https://cryptocellar.org/): the Scharnhorst intercept.
- [M4 Message Breaking Project](https://www.bytereef.org/m4_project.html): the broken U-264 message and the Scharnhorst key.
- Dirk Rijmenants, [Enigma Sim](https://www.ciphermachinesandcryptology.com/en/enigmasim.htm): its manual gives the Operation Barbarossa messages.
- A. P. Mahon, [The History of Hut Eight 1939–1945](http://www.ellsbury.com/hut8/hut8-000.htm) (National Archives HW 25/2) on ellsbury.com: the Navy indicating system, paired days, Grundstellung alphabets and the Ringstellung.
- Tony Sale, [Lecture on Naval Enigma](https://www.codesandciphers.org.uk/virtualbp/navenigma/navenig1.htm) on Codes and Ciphers: the Navy key, Banburismus and how the [day's settings follow from a Bombe stop](https://www.codesandciphers.org.uk/virtualbp/navenigma/navenig10.htm).
- Theodor Fontane, [Effi Briest](https://www.gutenberg.org/ebooks/5323) (Project Gutenberg): the German text for the letter frequencies.

## Development

Requires the .NET SDK from `global.json` and Node.js 24. Packaging publishes the backend with Native AOT, which needs the MSVC C++ tools. Visual Studio isn't required; Build Tools are enough:

```sh
winget install --id Microsoft.VisualStudio.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --wait"
```

```sh
cd src/frontend
npm ci
npm start        # starts Electron, which starts the backend
npm run make     # builds the installer into src/frontend/out/make
```

Frontend checks and tests (in `src/frontend`):

```sh
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest unit tests
npm run package    # builds the app; needed before the end-to-end tests
npm run test:e2e   # Playwright end-to-end tests
```

Backend:

```sh
dotnet test --solution Enigma.slnx
dotnet run --project src/backend/Enigma.Api
```
