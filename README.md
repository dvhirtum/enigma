# enigma

A simulator of the Kriegsmarine Enigma M3 and M4, with historically exact wirings. You set the machine up from key sheets, following the German Navy procedures. It is an Electron desktop app with a C# backend.

See [docs/design.md](docs/design.md) for the design.

## Building and testing

Requires the .NET 10 SDK and Node.js 22.

```
dotnet test --solution Enigma.slnx        # backend
cd src/frontend && npm ci && npm test     # renderer unit tests
cd src/frontend && npm run test:e2e       # packages the app, then drives it with Playwright
cd src/frontend && npm start              # run the app
```
