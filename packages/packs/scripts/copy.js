import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..', '..');
const source = path.join(root, 'packs');
const dest = process.cwd();

function copyRecursive(src, dst) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) {
      copyRecursive(s, d);
    } else if (e.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

if (!fs.existsSync(source)) {
  console.error('packs/ directory not found at repo root');
  process.exit(1);
}

copyRecursive(source, dest);
console.log('Copied packs/ → packages/packs/ for publish');

