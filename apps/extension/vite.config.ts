import { defineConfig, type Plugin } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { ManifestV3Export } from '@crxjs/vite-plugin';

const extensionRoot = dirname(fileURLToPath(import.meta.url));
const sourceManifestPath = join(extensionRoot, 'manifest.json');

const REQUIRED_PERMS = ['downloads', 'tabs', 'activeTab', 'scripting', 'storage'] as const;
const REQUIRED_HOST = '<all_urls>';

function loadManifest(): ManifestV3Export {
  const m = JSON.parse(readFileSync(sourceManifestPath, 'utf8')) as {
    version?: string;
    permissions?: string[];
    host_permissions?: string[];
    [key: string]: unknown;
  };
  const perms = new Set(m.permissions ?? []);
  for (const p of REQUIRED_PERMS) perms.add(p);
  m.permissions = [...perms];
  const hosts = new Set(m.host_permissions ?? []);
  hosts.add(REQUIRED_HOST);
  m.host_permissions = [...hosts];
  return m as ManifestV3Export;
}

/**
 * Watch/rebuild races can emit a dist manifest missing downloads / host_permissions.
 * Patch at every emit stage so captureVisibleTab + downloads always work.
 */
function ensureManifestPermissions(): Plugin {
  const applyPatch = (m: {
    version?: string;
    permissions?: string[];
    host_permissions?: string[];
  }) => {
    try {
      const src = JSON.parse(readFileSync(sourceManifestPath, 'utf8')) as {
        version?: string;
        permissions?: string[];
        host_permissions?: string[];
      };
      if (src.version) m.version = src.version;
    } catch {
      // source unreadable — still enforce required fields
    }
    const perms = new Set(m.permissions ?? []);
    for (const p of REQUIRED_PERMS) perms.add(p);
    m.permissions = [...perms];
    const hosts = new Set(m.host_permissions ?? []);
    hosts.add(REQUIRED_HOST);
    m.host_permissions = [...hosts];
    return m;
  };

  const patchFile = (outDir: string) => {
    const path = join(outDir, 'manifest.json');
    if (!existsSync(path)) return false;
    let raw: string;
    try {
      raw = readFileSync(path, 'utf8').trim();
    } catch {
      return false;
    }
    // Watch rebuilds can briefly leave an empty / half-written file.
    if (!raw || raw[0] !== '{') return false;
    let parsed: {
      version?: string;
      permissions?: string[];
      host_permissions?: string[];
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return false;
    }
    const m = applyPatch(parsed);
    try {
      writeFileSync(path, `${JSON.stringify(m, null, 2)}\n`);
    } catch {
      return false;
    }
    return m.permissions?.includes('downloads') === true;
  };

  const outDir = resolve(extensionRoot, 'dist');

  return {
    name: 'ensure-manifest-permissions',
    enforce: 'post',
    buildStart() {
      this.addWatchFile(sourceManifestPath);
    },
    generateBundle(_options, bundle) {
      const asset = bundle['manifest.json'];
      if (!asset || asset.type !== 'asset') return;
      const raw =
        typeof asset.source === 'string'
          ? asset.source
          : new TextDecoder().decode(asset.source);
      asset.source = `${JSON.stringify(applyPatch(JSON.parse(raw)), null, 2)}\n`;
    },
    writeBundle(options) {
      if (options.dir) patchFile(options.dir);
    },
    closeBundle() {
      patchFile(outDir);
      // crx sometimes rewrites the file after closeBundle in watch mode
      for (const ms of [0, 50, 150, 400, 1000]) {
        setTimeout(() => {
          if (!patchFile(outDir)) return;
          // Verify — if something stripped downloads again, keep retrying briefly
          try {
            const m = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8')) as {
              permissions?: string[];
            };
            if (!m.permissions?.includes('downloads')) patchFile(outDir);
          } catch {
            // ignore
          }
        }, ms);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    // Read from disk each config evaluation so Vite JSON-import cache can't
    // keep an older manifest without "downloads".
    crx({ manifest: loadManifest() }),
    ensureManifestPermissions(),
  ],
  resolve: {
    alias: {
      '@calipers/shared': resolve(extensionRoot, '../../packages/shared/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
