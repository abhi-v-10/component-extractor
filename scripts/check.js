#!/usr/bin/env node
/**
 * Extension integrity & manifest validator.
 * Checks Manifest V3 compliance, required icon files, and runs syntax checks.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

const extensionConfigs = [
  { name: 'Component Extractor (Firefox / Zen Browser)', dir: path.join(rootDir, 'component-extractor') },
  { name: 'Chrome (swarm-rebuild)', dir: path.join(rootDir, 'swarm-cursors', 'swarm-rebuild') },
  { name: 'Firefox (swarm-firefox)', dir: path.join(rootDir, 'swarm-cursors', 'swarm-firefox') }
];


let hasErrors = false;

console.log('🔍 Checking extension integrity and manifests...\n');

extensionConfigs.forEach(({ name, dir }) => {
  console.log(`Checking [${name}] in ${dir}:`);
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`  ❌ Missing manifest.json!`);
    hasErrors = true;
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`  ✓ manifest.json is valid JSON (version: ${manifest.version}, MV${manifest.manifest_version})`);
  } catch (e) {
    console.error(`  ❌ Invalid manifest.json JSON:`, e.message);
    hasErrors = true;
    return;
  }

  // Check icons
  if (manifest.icons) {
    for (const [size, iconRelPath] of Object.entries(manifest.icons)) {
      const fullIconPath = path.join(dir, iconRelPath);
      if (!fs.existsSync(fullIconPath)) {
        console.error(`  ❌ Missing icon ${size}: ${iconRelPath}`);
        hasErrors = true;
      } else {
        console.log(`  ✓ Icon ${size}px exists (${iconRelPath})`);
      }
    }
  }

  // Check background script / service worker
  if (manifest.background) {
    const bgScript = manifest.background.service_worker || manifest.background.scripts?.[0];
    if (bgScript) {
      const bgPath = path.join(dir, bgScript);
      if (!fs.existsSync(bgPath)) {
        console.error(`  ❌ Missing background file: ${bgScript}`);
        hasErrors = true;
      } else {
        console.log(`  ✓ Background script exists (${bgScript})`);
        try {
          execSync(`node --check "${bgPath}"`);
          console.log(`  ✓ Syntax check passed for ${bgScript}`);
        } catch (e) {
          console.error(`  ❌ Syntax error in ${bgScript}`);
          hasErrors = true;
        }
      }
    }
  }

  // Check swarm.js or extractor.js
  const scriptCandidates = ['swarm.js', 'extractor.js'];
  for (const scriptName of scriptCandidates) {
    const sPath = path.join(dir, scriptName);
    if (fs.existsSync(sPath)) {
      try {
        execSync(`node --check "${sPath}"`);
        console.log(`  ✓ Syntax check passed for ${scriptName}`);
      } catch (e) {
        console.error(`  ❌ Syntax error in ${scriptName}`);
        hasErrors = true;
      }
    }
  }


  console.log('');
});

if (hasErrors) {
  console.error('❌ Check failed with errors.');
  process.exit(1);
} else {
  console.log('🎉 All checks passed! Extension is properly structured.');
}
