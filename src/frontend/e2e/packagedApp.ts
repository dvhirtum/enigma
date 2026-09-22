import { readdirSync } from 'node:fs';
import path from 'node:path';

const outDirectory = path.resolve(__dirname, '..', 'out');

/// Locates the executable that `electron-forge package` produced for this platform.
export function packagedAppPath(): string {
  const directory = path.join(outDirectory, appDirectoryName());
  const entries = readdirSync(directory);

  if (process.platform === 'darwin') {
    const bundle = expect(entries, (name) => name.endsWith('.app'), directory);
    return path.join(directory, bundle, 'Contents', 'MacOS', path.basename(bundle, '.app'));
  }

  if (process.platform === 'win32') {
    return path.join(directory, expect(entries, (name) => name === 'Enigma.exe', directory));
  }

  return path.join(directory, expect(entries, (name) => name === 'enigma', directory));
}

function appDirectoryName(): string {
  return expect(
    readdirSync(outDirectory),
    (name) => name.includes(`-${process.platform}-`),
    outDirectory,
  );
}

function expect(names: string[], matches: (name: string) => boolean, directory: string): string {
  const found = names.filter(matches);

  if (found.length !== 1) {
    throw new Error(`Expected one match in ${directory}, found: ${names.join(', ')}`);
  }

  return found[0];
}
