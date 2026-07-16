import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function canonicalizeSourceText(value) {
  return value.replace(/\r\n?/g, '\n');
}

export function fingerprintSourceFiles(root, relativePaths) {
  const hash = createHash('sha256');

  for (const relativePath of relativePaths) {
    const canonicalPath = relativePath.replaceAll('\\', '/');
    const sourceText = fs.readFileSync(path.join(root, relativePath), 'utf8');
    hash.update(canonicalPath);
    hash.update('\0');
    hash.update(canonicalizeSourceText(sourceText));
    hash.update('\0');
  }

  return hash.digest('hex');
}
