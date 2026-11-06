#!/usr/bin/env node
/**
 * Cross-platform extension packager for Chrome and Firefox.
 * Uses python3's standard library zipfile module to ensure zero external npm dependencies.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Ensure extractor.js is up to date before packaging
try {
  execSync(`node "${path.join(__dirname, 'build-extractor.js')}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to bundle extractor.js:', e.message);
  process.exit(1);
}

const targets = {
  extractor: {
    src: path.join(rootDir, 'component-extractor'),
    prefix: 'component-extractor'
  },
  chrome: {
    src: path.join(rootDir, 'swarm-cursors', 'swarm-rebuild'),
    prefix: 'swarm-rebuild'
  },
  firefox: {
    src: path.join(rootDir, 'swarm-cursors', 'swarm-firefox'),
    prefix: 'swarm-firefox'
  }
};


const requestedTarget = process.argv[2] ? process.argv[2].toLowerCase() : 'all';

function packageTarget(name, config) {
  const manifestPath = path.join(config.src, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`[build] Manifest not found at: ${manifestPath}`);
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = manifest.version || '1.0.0';
  const zipFileName = `${config.prefix}-v${version}.zip`;
  const zipFilePath = path.join(distDir, zipFileName);

  console.log(`\n📦 Packaging ${name} extension (v${version})...`);
  console.log(`   Source: ${config.src}`);
  console.log(`   Destination: ${zipFilePath}`);

  // Use python3 zipfile to pack the contents of config.src directly at root of zip
  const pythonScript = `
import zipfile, os, sys

src_dir = sys.argv[1]
zip_path = sys.argv[2]

with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src_dir):
        # Exclude hidden files or OS specific files like .DS_Store
        files = [f for f in files if not f.startswith('.') and f != 'Thumbs.db']
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, src_dir)
            zf.write(full_path, rel_path)
            print(f"  + {rel_path}")
`;

  try {
    execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}" "${config.src}" "${zipFilePath}"`, {
      stdio: 'inherit'
    });
    const stats = fs.statSync(zipFilePath);
    const kb = (stats.size / 1024).toFixed(1);
    console.log(`✅ ${name} packaged successfully (${kb} KB): ${zipFileName}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to package ${name}:`, err.message);
    return false;
  }
}

let success = true;
if (requestedTarget === 'all' || requestedTarget === 'extractor') {
  success = packageTarget('Component Extractor (Firefox / Zen)', targets.extractor) && success;
}
if (requestedTarget === 'all' || requestedTarget === 'chrome') {
  success = packageTarget('Chrome (Swarm)', targets.chrome) && success;
}
if (requestedTarget === 'all' || requestedTarget === 'firefox') {
  success = packageTarget('Firefox (Swarm)', targets.firefox) && success;
}

if (!success) {
  process.exit(1);
}

