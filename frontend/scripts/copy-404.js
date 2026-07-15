import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dist = process.env.DIST_DIR || 'dist';
const indexPath = join(process.cwd(), dist, 'index.html');
const outPath = join(process.cwd(), dist, '404.html');

try {
  const html = readFileSync(indexPath, 'utf8');
  writeFileSync(outPath, html, 'utf8');
  console.log('Copied index.html -> 404.html');
} catch (err) {
  console.error('Failed to copy index to 404:', err.message);
  process.exit(1);
}
