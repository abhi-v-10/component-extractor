#!/usr/bin/env node
/**
 * Bundles the modular component-extractor src files into a single, clean,
 * standalone extractor.js content script (IIFE) for the Firefox / Zen Browser extension.
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'component-extractor', 'src');
const outPath = path.join(__dirname, '..', 'component-extractor', 'extractor.js');

const order = [
  'utils/zip-builder.js',
  'extractor/css-extractor.js',
  'extractor/asset-extractor.js',
  'extractor/dom-walker.js',
  'generators/html-generator.js',
  'generators/react-generator.js',
  'generators/tailwind-generator.js',
  'inspector/overlay.js',
  'ui/preview-modal.js',
  'content.js'
];

let bundle = `/**
 * Component Extractor Content Script
 * Generated: ${new Date().toISOString()}
 * Standalone Firefox / Zen Browser Manifest V3 Extension
 */
(() => {
  'use strict';

`;

for (const rel of order) {
  const filePath = path.join(srcDir, rel);
  if (!fs.existsSync(filePath)) {
    console.error(`[build-extractor] Missing source file: ${filePath}`);
    process.exit(1);
  }

  let code = fs.readFileSync(filePath, 'utf8');

  // Strip module.exports blocks to end of file
  code = code.replace(/if\s*\(typeof module\s*!==\s*['"]undefined['"][\s\S]*$/g, '');

  bundle += `  // --- [Module: ${rel}] ---\n`;
  bundle += code
    .split('\n')
    .map((l) => (l.length ? '  ' + l : l))
    .join('\n');
  bundle += '\n\n';
}

bundle += `})();\n`;

fs.writeFileSync(outPath, bundle, 'utf8');
console.log(`✅ Bundled component-extractor content script: ${outPath} (${(bundle.length / 1024).toFixed(1)} KB)`);
