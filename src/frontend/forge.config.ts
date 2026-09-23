import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { version } from './package.json';

const backendProject = path.resolve(__dirname, '../backend/Enigma.Api/Enigma.Api.csproj');
const backendOutput = path.resolve(__dirname, 'build/backend');

const runtimeIdentifiers: Record<string, string> = {
  win32: 'win',
  darwin: 'osx',
  linux: 'linux',
};

function publishBackend(platform: string, arch: string): void {
  rmSync(backendOutput, { recursive: true, force: true });
  execFileSync(
    'dotnet',
    [
      'publish', backendProject,
      '--configuration', 'Release',
      '--runtime', `${runtimeIdentifiers[platform]}-${arch}`,
      '--self-contained',
      '--output', backendOutput,
      `-p:Version=${version}`,
      '-p:DebugType=none',
    ],
    { stdio: 'inherit' },
  );
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'Enigma',
    extraResource: [backendOutput],
  },
  rebuildConfig: {},
  hooks: {
    prePackage: (_config, platform: string, arch: string) => {
      publishBackend(platform, arch);
      return Promise.resolve();
    },
  },
  makers: [
    new MakerSquirrel({ name: 'Enigma' }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
