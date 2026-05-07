import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { VerifyTagReport } from './interfaces/cli.interface';

export interface VerifyTagOptions {
  readonly distDir: string;
  readonly tag: string;
}

export class VerifyTagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerifyTagError';
  }
}

export function verifyTag({ distDir, tag }: VerifyTagOptions): VerifyTagReport {
  const version = tag.replace(/^.*v(?=\d)/, '');

  if (!/^\d+\.\d+\.\d+/.test(version)) {
    throw new VerifyTagError(`Could not extract a valid version from tag "${tag}"`);
  }

  const pkg: { version: string } = JSON.parse(
    readFileSync(resolve(distDir, 'package.json'), 'utf-8'),
  );

  return {
    tag,
    version,
    packageVersion: pkg.version,
    matches: pkg.version === version,
  };
}
