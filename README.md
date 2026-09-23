# enigma

A simulator of the Kriegsmarine Enigma M3 and M4, with historically exact wirings. You set the machine up from key sheets, following the German Navy procedures. It is an Electron desktop app with a C# backend.

See [docs/design.md](docs/design.md) for the design.

## Development

Requires the .NET SDK from `global.json`, Node.js 24, and (for `npm run make`, which publishes the backend with Native AOT) the Visual Studio "Desktop development with C++" workload.

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
