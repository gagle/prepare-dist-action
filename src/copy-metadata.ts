import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const METADATA_FILES = ['README.md', 'LICENSE', 'CHANGELOG.md', 'SECURITY.md', 'NOTICE'];

export function copyMetadata(packageDir: string, distDir: string): ReadonlyArray<string> {
  const copied: Array<string> = [];
  for (const file of METADATA_FILES) {
    const source = resolve(packageDir, file);
    if (existsSync(source)) {
      copyFileSync(source, resolve(distDir, file));
      copied.push(file);
    }
  }
  return copied;
}
