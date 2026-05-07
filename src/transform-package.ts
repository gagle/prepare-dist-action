import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TransformPackageReport } from './interfaces/cli.interface';
import type { PrepareDistContext } from './types';
import { stripDistPrefixWithCount } from './strip-dist-prefix';

interface PackageJson {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  files?: Array<string>;
  [key: string]: unknown;
}

const REMOVABLE_FIELDS = ['scripts', 'devDependencies', 'files'] as const;

export function transformPackage({
  packageDir,
  distDir,
  distName,
}: PrepareDistContext): TransformPackageReport {
  const raw = readFileSync(resolve(packageDir, 'package.json'), 'utf-8');
  const sourcePackageJsonHash = sha256(raw);
  const { text: stripped, replacedCount } = stripDistPrefixWithCount(raw, distName);
  const pkg: PackageJson = JSON.parse(stripped);

  const strippedFields: Array<string> = [];
  for (const field of REMOVABLE_FIELDS) {
    if (field in pkg) {
      strippedFields.push(field);
      delete pkg[field];
    }
  }

  const output = JSON.stringify(pkg, null, 2) + '\n';
  writeFileSync(resolve(distDir, 'package.json'), output);

  return {
    strippedFields,
    distPrefixStripped: replacedCount,
    sourcePackageJsonHash,
    outputPackageJsonHash: sha256(output),
    outputSizeBytes: Buffer.byteLength(output, 'utf-8'),
  };
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
