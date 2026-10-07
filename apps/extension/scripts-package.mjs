// Builds the extension for release and zips it for the Chrome Web Store.
//
//   pnpm --filter @raval/extension package
//
// It never reuses `dist`: that folder is whatever the dev watcher last wrote, which is a
// development build (it contains the motion tuning panel) and may be stale. This does a
// clean production build into its own folder, checks it, and writes release/raval-<version>.zip.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const release = join(root, 'release');
const out = join(release, 'build');
const zip = join(release, `raval-${source.version}.zip`);

rmSync(out, { recursive: true, force: true });
rmSync(zip, { force: true });
mkdirSync(release, { recursive: true });

execFileSync('pnpm', ['exec', 'vite', 'build', '--mode', 'production', '--outDir', out, '--emptyOutDir'], { cwd: root, stdio: 'inherit' });

const built = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
const problems = [];
for (const key of ['name', 'version', 'description']) {
  if (built[key] !== source[key]) problems.push(`${key} is "${built[key]}" but manifest.json says "${source[key]}"`);
}
if (built.action?.default_title !== source.action?.default_title) problems.push('toolbar title does not match manifest.json');
if (!built.permissions?.includes('downloads')) problems.push('the downloads permission is missing');
const assets = existsSync(join(out, 'assets')) ? readdirSync(join(out, 'assets')) : [];
if (assets.some((file) => file.startsWith('dev-dials'))) problems.push('this is a development build (it contains the tuning panel)');
if (problems.length > 0) {
  console.error('\nNot packaged:\n- ' + problems.join('\n- '));
  process.exit(1);
}

// Source maps are for debugging here, not for the store.
execFileSync('zip', ['-r', '-q', zip, '.', '-x', '*.map', '-x', '.DS_Store'], { cwd: out, stdio: 'inherit' });
console.log(`\n${built.name} ${built.version}\n${zip}`);
