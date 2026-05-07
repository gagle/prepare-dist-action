import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyTag } from './verify-tag';

describe('verifyTag', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'verify-tag-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeDistPackage(version: string): void {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ version }, null, 2));
  }

  describe('matching versions', () => {
    it('returns matches:true for a simple v-prefixed tag', () => {
      writeDistPackage('1.0.0');

      const result = verifyTag({ distDir: tmpDir, tag: 'v1.0.0' });
      expect(result.matches).toBe(true);
      expect(result.version).toBe('1.0.0');
      expect(result.packageVersion).toBe('1.0.0');
      expect(result.tag).toBe('v1.0.0');
    });

    it('returns matches:true for a component-prefixed tag', () => {
      writeDistPackage('2.3.1');

      expect(verifyTag({ distDir: tmpDir, tag: 'i18n-keygen-v2.3.1' }).matches).toBe(true);
    });

    it('returns matches:true for a deeply prefixed tag', () => {
      writeDistPackage('0.1.0');

      expect(verifyTag({ distDir: tmpDir, tag: 'some-scope-v0.1.0' }).matches).toBe(true);
    });

    it('returns matches:true for a prerelease version', () => {
      writeDistPackage('1.0.0-beta.1');

      expect(verifyTag({ distDir: tmpDir, tag: 'v1.0.0-beta.1' }).matches).toBe(true);
    });

    it('returns matches:true for a prerelease tag containing v in suffix', () => {
      writeDistPackage('1.0.0-preview.1');

      expect(verifyTag({ distDir: tmpDir, tag: 'v1.0.0-preview.1' }).matches).toBe(true);
    });

    it('returns matches:true for a component-prefixed prerelease tag with v', () => {
      writeDistPackage('2.0.0-dev.3');

      expect(verifyTag({ distDir: tmpDir, tag: 'my-service-v2.0.0-dev.3' }).matches).toBe(true);
    });
  });

  describe('mismatching versions', () => {
    it('returns matches:false when tag version differs from package version', () => {
      writeDistPackage('1.0.0');

      const result = verifyTag({ distDir: tmpDir, tag: 'v2.0.0' });
      expect(result.matches).toBe(false);
      expect(result.version).toBe('2.0.0');
      expect(result.packageVersion).toBe('1.0.0');
    });

    it('returns matches:false with component-prefixed tag on mismatch', () => {
      writeDistPackage('1.0.0');

      const result = verifyTag({ distDir: tmpDir, tag: 'my-lib-v3.0.0' });
      expect(result.matches).toBe(false);
      expect(result.version).toBe('3.0.0');
    });
  });

  describe('invalid tags', () => {
    it('throws for a tag with no version', () => {
      writeDistPackage('1.0.0');

      expect(() => verifyTag({ distDir: tmpDir, tag: 'main' })).toThrow(
        'Could not extract a valid version from tag "main"',
      );
    });

    it('throws for an empty tag', () => {
      writeDistPackage('1.0.0');

      expect(() => verifyTag({ distDir: tmpDir, tag: '' })).toThrow(
        'Could not extract a valid version from tag ""',
      );
    });
  });
});
