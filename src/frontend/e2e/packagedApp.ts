import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const productName = 'Enigma';
const outDirectory = path.resolve(__dirname, '..', 'out');

/// Locates the executable that `electron-forge package` produced for this platform.
export function packagedAppPath(): string {
  const directory = path.join(outDirectory, appDirectoryName());
  const executable =
    process.platform === 'darwin'
      ? path.join(directory, `${productName}.app`, 'Contents', 'MacOS', productName)
      : path.join(directory, process.platform === 'win32' ? `${productName}.exe` : productName);

  if (!existsSync(executable)) {
    throw new Error(`No packaged app at ${executable}. Run: npm run package`);
  }

  return executable;
}

function appDirectoryName(): string {
  if (!existsSync(outDirectory)) {
    throw new Error(`No ${outDirectory}. Run: npm run package`);
  }

  const matches = readdirSync(outDirectory).filter((name) =>
    name.includes(`-${process.platform}-`),
  );

  if (matches.length !== 1) {
    throw new Error(`Expected one package in ${outDirectory}, found: ${matches.join(', ')}`);
  }

  return matches[0];
}
