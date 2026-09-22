# CLAUDE.md

Navy Enigma simulator (M3 + M4). Electron + React frontend, C# (.NET 10) backend. See `docs/design.md`.

## Conventions

- Backend follows DDD + Clean Architecture. Dependencies point inward: Api → Infrastructure → Application → Domain. The Domain has no external dependencies.
- Rotor and reflector wirings must be historically exact. Back changes with historical test vectors.
- Backend tests use xUnit. Name them `Should_<expected>_When_<condition>` (snake case), and mark the `// Arrange`, `// Act` and `// Assert` parts of every test.
- Frontend tests use Vitest + React Testing Library, plus Playwright for end-to-end tests. They follow plain JavaScript naming conventions (the Should_When rule does not apply).

- Keep comments and docs, including this file, short. Describe what the application does, not why decisions were made or changed.

## Git workflow

- Never commit directly to `main`. Work on `feature/<topic>` branches and open a PR.
- Merge with squash only, and always replace the default message: `gh pr merge --squash --subject "<subject>" --body "<body>"`.
