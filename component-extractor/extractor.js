/**
 * Component Extractor Content Script
 * Generated: 2026-11-06T08:23:34.424Z
 * Standalone Firefox / Zen Browser Manifest V3 Extension
 */
(() => {
  'use strict';

  // --- [Module: utils/zip-builder.js] ---
  /**
   * Pure JavaScript ZIP file generator (No dependencies).
   * Generates standard PKZip 2.0 archives that unpack cleanly in all operating systems.
   */

  // Precomputed CRC32 table
  const CRC32_TABLE = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC32_TABLE[i] = c >>> 0;
  }

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function strToUtf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    const utf8 = [];
    for (let i = 0; i < str.length; i++) {
      let charcode = str.charCodeAt(i);
      if (charcode < 0x80) utf8.push(charcode);
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      } else {
        i++;
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf8.push(
          0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f)
        );
      }
    }
    return new Uint8Array(utf8);
  }

  class ZipBuilder {
    constructor() {
      this.files = [];
    }

    addFile(filename, content) {
      let data;
      if (typeof content === 'string') {
        data = strToUtf8Bytes(content);
      } else if (content instanceof Uint8Array) {
        data = content;
      } else if (content instanceof ArrayBuffer) {
        data = new Uint8Array(content);
      } else {
        throw new Error(`Unsupported content type for file: ${filename}`);
      }

      const nameBytes = strToUtf8Bytes(filename);
      const checksum = crc32(data);

      this.files.push({
        name: filename,
        nameBytes,
        data,
        size: data.length,
        crc: checksum,
        date: new Date()
      });
      return this;
    }

    buildUint8Array() {
      const localHeaders = [];
      const centralHeaders = [];
      let offset = 0;

      for (const f of this.files) {
        const time = ((f.date.getHours() << 11) | (f.date.getMinutes() << 5) | (f.date.getSeconds() >> 1)) & 0xFFFF;
        const date = (((f.date.getFullYear() - 1980) << 9) | ((f.date.getMonth() + 1) << 5) | f.date.getDate()) & 0xFFFF;

        // 1. Local File Header (30 bytes + name + data)
        const localHdr = new Uint8Array(30 + f.nameBytes.length + f.size);
        const lv = new DataView(localHdr.buffer);
        lv.setUint32(0, 0x04034B50, true); // signature
        lv.setUint16(4, 20, true);         // version needed (2.0)
        lv.setUint16(6, 0x0800, true);     // flags: bit 11 = UTF-8 filename
        lv.setUint16(8, 0, true);          // compression: 0 (STORED)
        lv.setUint16(10, time, true);
        lv.setUint16(12, date, true);
        lv.setUint32(14, f.crc, true);     // crc32
        lv.setUint32(18, f.size, true);    // compressed size
        lv.setUint32(22, f.size, true);    // uncompressed size
        lv.setUint16(26, f.nameBytes.length, true);
        lv.setUint16(28, 0, true);         // extra field length
        localHdr.set(f.nameBytes, 30);
        localHdr.set(f.data, 30 + f.nameBytes.length);
        localHeaders.push(localHdr);

        // 2. Central Directory Header (46 bytes + name)
        const cdHdr = new Uint8Array(46 + f.nameBytes.length);
        const cv = new DataView(cdHdr.buffer);
        cv.setUint32(0, 0x02014B50, true); // signature
        cv.setUint16(4, 20, true);         // version made by
        cv.setUint16(6, 20, true);         // version needed
        cv.setUint16(8, 0x0800, true);     // flags: UTF-8
        cv.setUint16(10, 0, true);         // compression: 0
        cv.setUint16(12, time, true);
        cv.setUint16(14, date, true);
        cv.setUint32(16, f.crc, true);
        cv.setUint32(20, f.size, true);
        cv.setUint32(24, f.size, true);
        cv.setUint16(28, f.nameBytes.length, true);
        cv.setUint16(30, 0, true);         // extra length
        cv.setUint16(32, 0, true);         // comment length
        cv.setUint16(34, 0, true);         // disk number
        cv.setUint16(36, 0, true);         // internal attrs
        cv.setUint32(38, 0, true);         // external attrs
        cv.setUint32(42, offset, true);    // relative offset of local header
        cdHdr.set(f.nameBytes, 46);
        centralHeaders.push(cdHdr);

        offset += localHdr.length;
      }

      const cdOffset = offset;
      let cdSize = 0;
      for (const h of centralHeaders) cdSize += h.length;

      // 3. End of Central Directory Record (22 bytes)
      const eocd = new Uint8Array(22);
      const ev = new DataView(eocd.buffer);
      ev.setUint32(0, 0x06054B50, true);   // signature
      ev.setUint16(4, 0, true);            // disk number
      ev.setUint16(6, 0, true);            // start disk
      ev.setUint16(8, this.files.length, true);  // records on disk
      ev.setUint16(10, this.files.length, true); // total records
      ev.setUint32(12, cdSize, true);      // size of central directory
      ev.setUint32(16, cdOffset, true);    // offset of central directory
      ev.setUint16(20, 0, true);           // comment length

      // Assemble everything into one buffer
      const totalSize = offset + cdSize + 22;
      const zipBuffer = new Uint8Array(totalSize);
      let pos = 0;
      for (const h of localHeaders) {
        zipBuffer.set(h, pos);
        pos += h.length;
      }
      for (const h of centralHeaders) {
        zipBuffer.set(h, pos);
        pos += h.length;
      }
      zipBuffer.set(eocd, pos);

      return zipBuffer;
    }

    toBlob() {
      const bytes = this.buildUint8Array();
      return new Blob([bytes], { type: 'application/zip' });
    }
  }



  // --- [Module: extractor/css-extractor.js] ---
  /**
   * CSS Extractor
   * Extracts computed styles, layout definitions, pseudo-elements, and fonts for extracted components.
   */

  const RELEVANT_PROPERTIES = [
    // Layout & Box Model
    'display', 'box-sizing', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'overflow', 'overflow-x', 'overflow-y',

    // Flexbox & Grid
    'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content',
    'align-self', 'gap', 'row-gap', 'column-gap', 'flex-grow', 'flex-shrink', 'flex-basis',
    'grid-template-columns', 'grid-template-rows', 'grid-auto-flow',
    'grid-auto-columns', 'grid-auto-rows', 'grid-column', 'grid-row',

    // Typography
    'color', 'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-align', 'text-decoration',
    'text-transform', 'white-space', 'word-break', 'text-overflow',

    // Background & Appearance
    'background-color', 'background-image', 'background-size', 'background-position',
    'background-repeat', 'background-clip',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    'box-shadow', 'opacity', 'transform', 'filter', 'backdrop-filter', 'cursor',

    // SVG Specific
    'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'
  ];

  // Default browser values that clutter extracted stylesheets
  const DEFAULT_VALUES = {
    'position': 'static',
    'z-index': 'auto',
    'opacity': '1',
    'transform': 'none',
    'filter': 'none',
    'backdrop-filter': 'none',
    'box-shadow': 'none',
    'background-image': 'none',
    'cursor': 'auto',
    'margin-top': '0px',
    'margin-right': '0px',
    'margin-bottom': '0px',
    'margin-left': '0px',
    'padding-top': '0px',
    'padding-right': '0px',
    'padding-bottom': '0px',
    'padding-left': '0px',
    'border-top-width': '0px',
    'border-right-width': '0px',
    'border-bottom-width': '0px',
    'border-left-width': '0px',
    'border-top-style': 'none',
    'border-right-style': 'none',
    'border-bottom-style': 'none',
    'border-left-style': 'none',
    'border-top-left-radius': '0px',
    'border-top-right-radius': '0px',
    'border-bottom-right-radius': '0px',
    'border-bottom-left-radius': '0px',
    'flex-grow': '0',
    'flex-shrink': '1',
    'flex-basis': 'auto',
    'align-self': 'auto',
    'min-width': '0px',
    'min-height': '0px',
    'max-width': 'none',
    'max-height': 'none',
    'top': 'auto',
    'right': 'auto',
    'bottom': 'auto',
    'left': 'auto',
    'letter-spacing': 'normal',
    'text-transform': 'none',
    'text-decoration': 'none solid rgb(0, 0, 0)',
    'overflow': 'visible',
    'overflow-x': 'visible',
    'overflow-y': 'visible'
  };

  function isTransparent(color) {
    if (!color || color === 'transparent') return true;
    if (color === 'rgba(0, 0, 0, 0)') return true;
    return false;
  }

  function extractElementStyles(element, options = {}) {
    const win = element.ownerDocument.defaultView || window;
    const cs = win.getComputedStyle(element);
    const styles = {};

    for (const prop of RELEVANT_PROPERTIES) {
      const val = cs.getPropertyValue(prop);
      if (!val) continue;

      // Filter defaults
      if (DEFAULT_VALUES[prop] === val) continue;
      if (prop === 'background-color' && isTransparent(val)) continue;
      if (prop.endsWith('-color') && cs.getPropertyValue(prop.replace('-color', '-style')) === 'none') continue;

      // Relative URLs in background-image should be resolved
      if (prop === 'background-image' && val.includes('url(')) {
        styles[prop] = resolveCssUrls(val, element.ownerDocument.baseURI);
      } else {
        styles[prop] = val;
      }
    }

    return styles;
  }

  function extractPseudoStyles(element, pseudo) {
    const win = element.ownerDocument.defaultView || window;
    const cs = win.getComputedStyle(element, pseudo);
    const content = cs.getPropertyValue('content');

    if (!content || content === 'none' || content === 'normal' || content === '""') {
      return null;
    }

    const styles = { content };
    for (const prop of RELEVANT_PROPERTIES) {
      const val = cs.getPropertyValue(prop);
      if (!val) continue;
      if (DEFAULT_VALUES[prop] === val) continue;
      if (prop === 'background-color' && isTransparent(val)) continue;
      styles[prop] = val;
    }
    return styles;
  }

  function resolveCssUrls(cssValue, baseURI) {
    return cssValue.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (match, url) => {
      if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
        return match;
      }
      try {
        const absUrl = new URL(url, baseURI).href;
        return `url("${absUrl}")`;
      } catch (_) {
        return match;
      }
    });
  }

  function formatStylesToCssRules(selector, styles) {
    const lines = Object.entries(styles)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([prop, val]) => `  ${prop}: ${val};`);

    if (!lines.length) return '';
    return `${selector} {\n${lines.join('\n')}\n}\n`;
  }



  // --- [Module: extractor/asset-extractor.js] ---
  /**
   * Asset Extractor
   * Identifies, normalizes, and extracts images, SVGs, and fonts from a DOM subtree.
   */

  function extractAssets(element) {
    const baseURI = element.ownerDocument.baseURI;
    const images = [];
    const svgs = [];
    const fontFamilies = new Set();

    // 1. Traverse subtree for images and SVGs
    const allElements = [element, ...element.querySelectorAll('*')];

    allElements.forEach((el) => {
      // Collect font families
      try {
        const cs = (el.ownerDocument.defaultView || window).getComputedStyle(el);
        const ff = cs.getPropertyValue('font-family');
        if (ff) {
          ff.split(',').forEach((name) => {
            const clean = name.trim().replace(/^['"]|['"]$/g, '');
            if (clean && !isGenericFont(clean)) {
              fontFamilies.add(clean);
            }
          });
        }

        // Check background-image
        const bgImg = cs.getPropertyValue('background-image');
        if (bgImg && bgImg !== 'none') {
          const matches = bgImg.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g);
          for (const m of matches) {
            images.push({
              type: 'background',
              originalUrl: m[1],
              resolvedUrl: resolveUrl(m[1], baseURI)
            });
          }
        }
      } catch (_) {}

      // Check <img>
      if (el.tagName.toLowerCase() === 'img') {
        const src = el.getAttribute('src');
        if (src) {
          images.push({
            type: 'img',
            originalUrl: src,
            resolvedUrl: resolveUrl(src, baseURI),
            alt: el.getAttribute('alt') || '',
            element: el
          });
        }
      }

      // Check <svg>
      if (el.tagName.toLowerCase() === 'svg') {
        svgs.push({
          type: 'svg',
          element: el,
          outerHTML: el.outerHTML
        });
      }
    });

    return {
      images,
      svgs,
      fontFamilies: Array.from(fontFamilies)
    };
  }

  function isGenericFont(font) {
    const generics = new Set([
      'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
      'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
      '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'
    ]);
    return generics.has(font);
  }

  function resolveUrl(url, baseURI) {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    try {
      return new URL(url, baseURI).href;
    } catch (_) {
      return url;
    }
  }



  // --- [Module: extractor/dom-walker.js] ---
  /**
   * DOM Walker & Subtree Sanitizer
   * Clones and structures the component DOM tree, traversing Shadow DOM where open.
   */

  const REMOVE_ATTR_PREFIXES = ['data-v-', 'data-react', 'ng-', 'v-', 'jsaction', 'jscontroller', 'jsmodel', 'jsdata'];
  const REMOVE_ATTR_EXACT = new Set(['contenteditable', 'spellcheck', 'draggable']);

  function cleanAttributes(el, baseURI) {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();

      // Remove inline event handlers
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Remove framework internal markers
      if (REMOVE_ATTR_EXACT.has(name) || REMOVE_ATTR_PREFIXES.some((pre) => name.startsWith(pre))) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Resolve relative URLs
      if (name === 'src' || name === 'href') {
        const val = attr.value;
        if (val && !val.startsWith('#') && !val.startsWith('javascript:')) {
          try {
            el.setAttribute(attr.name, new URL(val, baseURI).href);
          } catch (_) {}
        }
      }
    }
  }

  /**
   * Creates a clean clone of the element subtree.
   * Handles accessible Shadow DOM by expanding shadow roots into styled containers.
   */
  function cloneAndCleanSubtree(rootElement, idPrefix = 'ce') {
    const baseURI = rootElement.ownerDocument.baseURI;
    let counter = 0;
    const elementMap = new Map(); // original DOM element -> clean clone element

    function walk(origNode, parentClone) {
      if (origNode.nodeType === 3) { // Text node
        const textClone = origNode.cloneNode(true);
        if (parentClone) parentClone.appendChild(textClone);
        return textClone;
      }

      if (origNode.nodeType === 8) { // Comment
        return null;
      }

      if (origNode.nodeType !== 1) { // Not an element
        return null;
      }

      const tag = origNode.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'noscript') {
        return null;
      }

      const clone = document.createElement(tag);
      // Copy attributes
      for (const attr of origNode.attributes) {
        try {
          clone.setAttribute(attr.name, attr.value);
        } catch (_) {}
      }
      cleanAttributes(clone, baseURI);

      // Assign a unique scoped component class
      counter++;
      const scopedClass = `${idPrefix}-el-${counter}`;
      clone.classList.add(scopedClass);

      elementMap.set(origNode, {
        original: origNode,
        clone,
        scopedClass
      });

      if (parentClone) {
        parentClone.appendChild(clone);
      }

      // Handle Shadow DOM if present and open
      if (origNode.shadowRoot) {
        const shadowContainer = document.createElement('div');
        shadowContainer.className = `${idPrefix}-shadow-root`;
        clone.appendChild(shadowContainer);
        for (const child of origNode.shadowRoot.childNodes) {
          walk(child, shadowContainer);
        }
      } else {
        // Normal children
        for (const child of origNode.childNodes) {
          walk(child, clone);
        }
      }

      return clone;
    }

    const clonedRoot = walk(rootElement, null);
    return {
      clonedRoot,
      elementMap
    };
  }



  // --- [Module: generators/html-generator.js] ---
  /**
   * HTML & CSS Generator
   * Produces clean, standalone, formatted HTML and CSS for extracted components.
   */

  function indentHtml(htmlString) {
    let formatted = '';
    let indent = 0;
    const tab = '  ';

    const parts = htmlString.replace(/>\s*</g, '>\n<').split('\n');
    const voidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]);

    for (let line of parts) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }

      formatted += tab.repeat(indent) + line + '\n';

      const match = line.match(/^<([a-zA-Z0-9-]+)/);
      if (match && !line.startsWith('</')) {
        const tagName = match[1].toLowerCase();
        const isSelfClosing = line.endsWith('/>') || voidElements.has(tagName);
        const isInlineClosed = line.includes(`</${tagName}>`);
        if (!isSelfClosing && !isInlineClosed) {
          indent++;
        }
      }
    }

    return formatted.trim();
  }

  function generateComponentPackage(clonedRoot, cssRulesList, options = {}) {
    const componentTitle = options.title || 'Extracted Component';
    const fonts = options.fonts || [];

    // 1. Component HTML fragment
    const rawHtml = clonedRoot.outerHTML;
    const formattedComponentHtml = indentHtml(rawHtml);

    // 2. Component CSS
    let fontImports = '';
    let fontLinks = '';
    if (fonts.length > 0) {
      // Check if any popular Google Fonts are used
      const validGoogleFonts = fonts.filter((f) => /^[a-zA-Z0-9\s]+$/.test(f));
      if (validGoogleFonts.length > 0) {
        const familyParams = validGoogleFonts.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join('&');
        const fontUrl = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
        fontImports = `@import url('${fontUrl}');\n\n`;
        fontLinks = `  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="${fontUrl}" rel="stylesheet">\n`;
      }
    }

    const cssHeader = `/* =========================================================================
     Component Extractor: ${componentTitle}
     Generated: ${new Date().toISOString()}
     ========================================================================= */

  ${fontImports}/* Box-sizing reset for faithful rendering */
  *, *::before, *::after {
    box-sizing: border-box;
  }

  `;

    const formattedCss = cssHeader + cssRulesList.join('\n');

    // 3. Standalone Complete index.html
    const standaloneHtml = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${componentTitle}</title>
  ${fontLinks}  <link rel="stylesheet" href="style.css">

    <style>
      /* Standalone Preview Container */
      body {
        margin: 0;
        padding: 40px 20px;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: #0f141c;
        background-image: radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0);
        background-size: 24px 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
    </style>
  </head>
  <body>

  <!-- BEGIN EXTRACTED COMPONENT -->
  ${formattedComponentHtml}
  <!-- END EXTRACTED COMPONENT -->

  </body>
  </html>
  `;

    return {
      componentHtml: formattedComponentHtml,
      componentCss: formattedCss,
      standaloneHtml,
      title: componentTitle
    };
  }



  // --- [Module: generators/react-generator.js] ---
  /**
   * React Component Generator (Phase 2 Architecture)
   * Prepares the architectural interface for generating modular React/JSX components.
   */

  class ReactGenerator {
    constructor(options = {}) {
      this.componentName = options.componentName || 'ExtractedComponent';
      this.useTypeScript = options.useTypeScript || false;
      this.extractProps = options.extractProps || false;
    }

    /**
     * Transforms extracted component HTML and CSS into a React JSX component template.
     * Phase 2 implementation hook.
     *
     * @param {Object} componentData - { componentHtml, componentCss, assets }
     * @returns {Object} { jsxCode, cssModuleCode, propsDefinition }
     */
    generate(componentData) {
      const rawHtml = componentData.componentHtml || '';
      const jsxHtml = this.convertHtmlToJsx(rawHtml);

      const jsxCode = `import React from 'react';
  import './${this.componentName}.css';

  /**
   * ${this.componentName}
   * Extracted with Component Extractor
   */
  export default function ${this.componentName}(props) {
    return (
      ${jsxHtml.split('\n').map((l, i) => (i === 0 ? l : '    ' + l)).join('\n')}
    );
  }
  `;

      return {
        componentName: this.componentName,
        jsxCode,
        cssCode: componentData.componentCss || '',
        phase: 2,
        status: 'architecture_ready'
      };
    }

    /**
     * Helper that maps standard HTML attributes to JSX properties.
     */
    convertHtmlToJsx(html) {
      return html
        // class -> className
        .replace(/\sclass=/g, ' className=')
        // for -> htmlFor
        .replace(/\sfor=/g, ' htmlFor=')
        // tabindex -> tabIndex
        .replace(/\stabindex=/g, ' tabIndex=')
        // autocomplete -> autoComplete
        .replace(/\sautocomplete=/g, ' autoComplete=')
        // Self-closing void tags
        .replace(/<(img|input|br|hr)([^>]*[^\/])>/gi, '<$1$2 />');
    }
  }



  // --- [Module: generators/tailwind-generator.js] ---
  /**
   * Tailwind CSS Generator (Phase 2 Architecture)
   * Prepares the architecture and mapping dictionary for converting extracted computed styles
   * to utility Tailwind CSS classes.
   */

  const STATIC_PROPERTY_MAP = {
    'display: flex': 'flex',
    'display: inline-flex': 'inline-flex',
    'display: grid': 'grid',
    'display: inline-grid': 'inline-grid',
    'display: block': 'block',
    'display: inline-block': 'inline-block',
    'display: inline': 'inline',
    'display: none': 'hidden',
    'flex-direction: row': 'flex-row',
    'flex-direction: column': 'flex-col',
    'flex-wrap: wrap': 'flex-wrap',
    'justify-content: center': 'justify-center',
    'justify-content: space-between': 'justify-between',
    'justify-content: flex-start': 'justify-start',
    'justify-content: flex-end': 'justify-end',
    'align-items: center': 'items-center',
    'align-items: flex-start': 'items-start',
    'align-items: flex-end': 'items-end',
    'position: relative': 'relative',
    'position: absolute': 'absolute',
    'position: fixed': 'fixed',
    'position: sticky': 'sticky',
    'text-align: center': 'text-center',
    'text-align: left': 'text-left',
    'text-align: right': 'text-right',
    'font-weight: 700': 'font-bold',
    'font-weight: 600': 'font-semibold',
    'font-weight: 500': 'font-medium',
    'font-weight: 400': 'font-normal'
  };

  class TailwindGenerator {
    constructor(options = {}) {
      this.prefix = options.prefix || '';
    }

    /**
     * Translates style rules into Tailwind utility classes.
     * Phase 2 implementation hook.
     *
     * @param {Object} styles - Computed styles dictionary
     * @returns {Array<string>} list of mapped utility classes
     */
    mapStylesToTailwind(styles) {
      const classes = [];

      for (const [prop, val] of Object.entries(styles)) {
        const key = `${prop}: ${val}`;
        if (STATIC_PROPERTY_MAP[key]) {
          classes.push(STATIC_PROPERTY_MAP[key]);
        } else if (prop === 'padding' || prop === 'margin' || prop === 'gap') {
          const px = parseInt(val, 10);
          if (!isNaN(px)) {
            const prefix = prop === 'padding' ? 'p' : (prop === 'margin' ? 'm' : 'gap');
            const twVal = px % 4 === 0 ? px / 4 : `[${px}px]`;
            classes.push(`${prefix}-${twVal}`);
          }
        }
      }

      return classes;
    }

    /**
     * Generates Tailwind preview information for Phase 2 UI.
     */
    generatePreview(componentData) {
      return {
        status: 'architecture_ready',
        phase: 2,
        description: 'Automated conversion of computed CSS layout, spacing, and typography to Tailwind utility classes.',
        staticMapSize: Object.keys(STATIC_PROPERTY_MAP).length
      };
    }
  }



  // --- [Module: inspector/overlay.js] ---
  /**
   * Visual Element Inspector Overlay
   * Renders an isolated Shadow DOM highlighting box, dimensions badge, and breadcrumbs.
   */

  class InspectorOverlay {
    constructor(onSelect, onCancel) {
      this.onSelect = onSelect;
      this.onCancel = onCancel;
      this.active = false;
      this.currentElement = null;

      // Bound listeners
      this._handlePointerMove = this._handlePointerMove.bind(this);
      this._handleClick = this._handleClick.bind(this);
      this._handleKeyDown = this._handleKeyDown.bind(this);
      this._handleScroll = this._handleScroll.bind(this);
    }

    mount() {
      if (this.host) return;

      // Create isolated container
      this.host = document.createElement('div');
      this.host.id = 'component-extractor-inspector-host';
      this.host.style.cssText = 'all: initial; position: absolute; top: 0; left: 0; z-index: 2147483647; pointer-events: none;';

      this.shadow = this.host.attachShadow({ mode: 'open' });

      // Styles
      const style = document.createElement('style');
      style.textContent = `
        :host {
          all: initial;
          pointer-events: none;
        }
        .highlight-box {
          position: fixed;
          border: 2px solid #6366f1;
          background: rgba(99, 102, 241, 0.12);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), 0 0 16px rgba(99, 102, 241, 0.35);
          pointer-events: none;
          transition: all 0.06s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 2147483646;
          border-radius: 3px;
          box-sizing: border-box;
        }
        .badge {
          position: absolute;
          top: -28px;
          left: 0;
          background: #1e1e2e;
          color: #e2e8f0;
          border: 1px solid #4f46e5;
          border-radius: 4px;
          padding: 3px 8px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.2;
          white-space: nowrap;
          pointer-events: none;
          display: flex;
          gap: 6px;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .badge-tag {
          color: #38bdf8;
        }
        .badge-dims {
          color: #94a3b8;
          font-size: 10px;
        }
        .instructions-banner {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid #4338ca;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          border-radius: 999px;
          padding: 8px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          z-index: 2147483647;
          pointer-events: auto;
        }
        .kbd {
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 4px;
          padding: 2px 6px;
          font-family: monospace;
          font-size: 11px;
          color: #38bdf8;
        }
        .close-btn {
          background: #334155;
          border: none;
          color: #cbd5e1;
          cursor: pointer;
          border-radius: 999px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .close-btn:hover {
          background: #475569;
          color: #fff;
        }
      `;

      this.shadow.appendChild(style);

      this.box = document.createElement('div');
      this.box.className = 'highlight-box';
      this.box.style.display = 'none';

      this.badge = document.createElement('div');
      this.badge.className = 'badge';
      this.box.appendChild(this.badge);

      this.banner = document.createElement('div');
      this.banner.className = 'instructions-banner';
      this.banner.innerHTML = `
        <span>🎯 <strong>Click</strong> to extract component</span>
        <span><span class="kbd">↑</span> / <span class="kbd">↓</span> Select parent / child</span>
        <span><span class="kbd">Esc</span> Cancel</span>
        <button class="close-btn" id="banner-close" title="Cancel (Esc)">✕</button>
      `;

      this.shadow.appendChild(this.box);
      this.shadow.appendChild(this.banner);

      this.banner.querySelector('#banner-close').addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancel();
      });

      document.documentElement.appendChild(this.host);

      // Attach global listeners
      window.addEventListener('pointermove', this._handlePointerMove, { capture: true, passive: true });
      window.addEventListener('click', this._handleClick, { capture: true });
      window.addEventListener('keydown', this._handleKeyDown, { capture: true });
      window.addEventListener('scroll', this._handleScroll, { capture: true, passive: true });

      this.active = true;
    }

    unmount() {
      this.active = false;
      window.removeEventListener('pointermove', this._handlePointerMove, { capture: true });
      window.removeEventListener('click', this._handleClick, { capture: true });
      window.removeEventListener('keydown', this._handleKeyDown, { capture: true });
      window.removeEventListener('scroll', this._handleScroll, { capture: true });

      if (this.host && this.host.parentNode) {
        this.host.parentNode.removeChild(this.host);
      }
      this.host = null;
      this.currentElement = null;
    }

    cancel() {
      this.unmount();
      if (this.onCancel) this.onCancel();
    }

    _handlePointerMove(e) {
      if (!this.active) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || target === this.host || this.host.contains(target)) return;
      this.highlight(target);
    }

    highlight(element) {
      if (!element || element === document.documentElement || element === document.body) {
        return;
      }
      this.currentElement = element;
      const rect = element.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        this.box.style.display = 'none';
        return;
      }

      this.box.style.display = 'block';
      this.box.style.left = `${Math.round(rect.left)}px`;
      this.box.style.top = `${Math.round(rect.top)}px`;
      this.box.style.width = `${Math.round(rect.width)}px`;
      this.box.style.height = `${Math.round(rect.height)}px`;

      // Position badge above box, or inside if near top edge
      if (rect.top < 32) {
        this.badge.style.top = '4px';
        this.badge.style.left = '4px';
      } else {
        this.badge.style.top = '-28px';
        this.badge.style.left = '0';
      }

      // Badge label text
      const tagName = element.tagName.toLowerCase();
      const id = element.id ? `#${element.id}` : '';
      const classNames = element.className && typeof element.className === 'string'
        ? '.' + element.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.')
        : '';

      const label = `${tagName}${id}${classNames}`;
      const dims = `${Math.round(rect.width)} × ${Math.round(rect.height)}px`;

      this.badge.innerHTML = `
        <span class="badge-tag">&lt;${label}&gt;</span>
        <span class="badge-dims">${dims}</span>
      `;
    }

    _handleClick(e) {
      if (!this.active) return;

      // Ignore clicks on banner buttons
      if (this.banner && (e.target === this.banner || this.banner.contains(e.target))) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const selected = this.currentElement;
      this.unmount();

      if (selected && this.onSelect) {
        this.onSelect(selected);
      }
    }

    _handleKeyDown(e) {
      if (!this.active) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
        return;
      }

      // Arrow Up: Select Parent
      if (e.key === 'ArrowUp' && this.currentElement && this.currentElement.parentElement) {
        e.preventDefault();
        if (this.currentElement.parentElement !== document.documentElement) {
          this.highlight(this.currentElement.parentElement);
        }
        return;
      }

      // Arrow Down: Select First Element Child
      if (e.key === 'ArrowDown' && this.currentElement && this.currentElement.firstElementChild) {
        e.preventDefault();
        this.highlight(this.currentElement.firstElementChild);
        return;
      }
    }

    _handleScroll() {
      if (this.active && this.currentElement) {
        this.highlight(this.currentElement);
      }
    }
  }



  // --- [Module: ui/preview-modal.js] ---
  /**
   * Preview Modal UI
   * Displays the extracted component in a sandboxed iframe, shows code tabs,
   * supports Copying, and builds/downloads a clean ZIP bundle.
   */

  class PreviewModal {
    constructor(packageData, reactData, tailwindData, zipBuilder) {
      this.packageData = packageData;
      this.reactData = reactData;
      this.tailwindData = tailwindData;
      this.zipBuilder = zipBuilder;
      this.host = null;
      this._handleKeyDown = this._handleKeyDown.bind(this);
    }

    show() {
      this.host = document.createElement('div');
      this.host.id = 'component-extractor-modal-host';
      this.host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647;';

      this.shadow = this.host.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 15, 30, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .modal {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 14px;
          width: 100%;
          max-width: 980px;
          height: 85vh;
          max-height: 800px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
          overflow: hidden;
          color: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        /* Header */
        .header {
          padding: 16px 20px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-pill {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .title {
          font-size: 15px;
          font-weight: 600;
          color: #f8fafc;
        }
        .actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .btn {
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid transparent;
          transition: all 0.15s ease;
        }
        .btn-secondary {
          background: #334155;
          color: #f1f5f9;
        }
        .btn-secondary:hover { background: #475569; }
        .btn-primary {
          background: #4f46e5;
          color: #fff;
        }
        .btn-primary:hover { background: #6366f1; }
        .btn-success {
          background: #16a34a;
          color: #fff;
        }
        .btn-success:hover { background: #22c55e; }
        .btn-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 18px;
          padding: 6px 10px;
          cursor: pointer;
          border-radius: 6px;
        }
        .btn-close:hover { background: #334155; color: #fff; }

        /* Tabs */
        .tabs {
          display: flex;
          background: #0b1120;
          border-bottom: 1px solid #1e293b;
          padding: 0 16px;
        }
        .tab-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tab-btn:hover { color: #f1f5f9; }
        .tab-btn.active {
          color: #818cf8;
          border-bottom-color: #818cf8;
        }
        .badge-tag {
          font-size: 10px;
          background: rgba(129, 140, 248, 0.15);
          color: #818cf8;
          padding: 2px 6px;
          border-radius: 999px;
        }

        /* Content Area */
        .content {
          flex: 1;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .tab-panel {
          display: none;
          flex: 1;
          overflow: auto;
          position: relative;
        }
        .tab-panel.active {
          display: flex;
          flex-direction: column;
        }

        /* Preview Frame */
        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: #090d16;
        }

        /* Code Block */
        .code-container {
          flex: 1;
          overflow: auto;
          padding: 16px;
          background: #090d16;
        }
        pre {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
          line-height: 1.5;
          color: #e2e8f0;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .copy-floating-btn {
          position: absolute;
          top: 12px;
          right: 16px;
          background: #1e293b;
          color: #cbd5e1;
          border: 1px solid #475569;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 11px;
          cursor: pointer;
        }
        .copy-floating-btn:hover { background: #334155; color: #fff; }

        /* Phase 2 Panel */
        .phase2-panel {
          padding: 24px;
          background: #090d16;
          flex: 1;
          overflow: auto;
        }
        .phase2-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 18px;
          margin-bottom: 20px;
        }
        .phase2-card h4 {
          margin-bottom: 8px;
          color: #38bdf8;
          font-size: 14px;
        }
        .phase2-card p {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        /* Toast Notification */
        .toast {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: #22c55e;
          color: #fff;
          padding: 8px 18px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          z-index: 100;
        }
        .toast.show {
          transform: translateX(-50%) translateY(0);
        }
      `;

      this.shadow.appendChild(style);

      const backdrop = document.createElement('div');
      backdrop.className = 'backdrop';

      backdrop.innerHTML = `
        <div class="modal">
          <div class="header">
            <div class="title-group">
              <span class="logo-pill">EXTRACTED</span>
              <div class="title">${escapeHtml(this.packageData.title)}</div>
            </div>
            <div class="actions">
              <button class="btn btn-secondary" id="btn-copy-html">Copy HTML</button>
              <button class="btn btn-secondary" id="btn-copy-css">Copy CSS</button>
              <button class="btn btn-success" id="btn-download-zip">📦 Download ZIP</button>
              <button class="btn-close" id="btn-close" title="Close (Esc)">✕</button>
            </div>
          </div>

          <div class="tabs">
            <button class="tab-btn active" data-tab="preview">👁️ Live Preview</button>
            <button class="tab-btn" data-tab="html">📄 HTML</button>
            <button class="tab-btn" data-tab="css">🎨 CSS</button>
            <button class="tab-btn" data-tab="phase2">⚛️ React / Tailwind <span class="badge-tag">Phase 2</span></button>
          </div>

          <div class="content">
            <!-- Preview Tab -->
            <div class="tab-panel active" id="panel-preview">
              <iframe class="preview-iframe" sandbox="allow-scripts" srcdoc="${escapeHtml(this.packageData.standaloneHtml)}"></iframe>
            </div>

            <!-- HTML Tab -->
            <div class="tab-panel" id="panel-html">
              <button class="copy-floating-btn" id="btn-copy-html-inner">Copy HTML</button>
              <div class="code-container">
                <pre><code>${escapeHtml(this.packageData.componentHtml)}</code></pre>
              </div>
            </div>

            <!-- CSS Tab -->
            <div class="tab-panel" id="panel-css">
              <button class="copy-floating-btn" id="btn-copy-css-inner">Copy CSS</button>
              <div class="code-container">
                <pre><code>${escapeHtml(this.packageData.componentCss)}</code></pre>
              </div>
            </div>

            <!-- Phase 2 Tab -->
            <div class="tab-panel" id="panel-phase2">
              <div class="phase2-panel">
                <div class="phase2-card">
                  <h4>⚛️ React JSX Component (Architecture Prepared)</h4>
                  <p>Modular component ready to be dropped into a React 18+ application.</p>
                  <div class="code-container" style="max-height: 250px; border-radius: 6px;">
                    <pre><code>${escapeHtml(this.reactData.jsxCode)}</code></pre>
                  </div>
                </div>

                <div class="phase2-card">
                  <h4>🌬️ Tailwind CSS Mapping (Architecture Prepared)</h4>
                  <p>${escapeHtml(this.tailwindData.description)} Ready for AST class mapping integration in Phase 2.</p>
                  <p style="font-size: 12px; color: #38bdf8;">✓ ${this.tailwindData.staticMapSize} core utility property maps configured.</p>
                </div>
              </div>
            </div>

            <!-- Toast -->
            <div class="toast" id="toast">Copied to clipboard!</div>
          </div>
        </div>
      `;

      this.shadow.appendChild(backdrop);
      document.documentElement.appendChild(this.host);

      this.backdrop = backdrop;
      this.toast = this.shadow.querySelector('#toast');

      this._bindEvents();
      window.addEventListener('keydown', this._handleKeyDown, { capture: true });
    }

    _bindEvents() {
      // Tab switching
      const tabBtns = this.shadow.querySelectorAll('.tab-btn');
      const panels = this.shadow.querySelectorAll('.tab-panel');

      tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          tabBtns.forEach((b) => b.classList.remove('active'));
          panels.forEach((p) => p.classList.remove('active'));

          btn.classList.add('active');
          const tab = btn.dataset.tab;
          this.shadow.querySelector(`#panel-${tab}`).classList.add('active');
        });
      });

      // Close
      this.shadow.querySelector('#btn-close').addEventListener('click', () => this.close());
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) this.close();
      });

      // Copy HTML
      const copyHtml = () => this._copy(this.packageData.componentHtml, 'HTML copied to clipboard!');
      this.shadow.querySelector('#btn-copy-html').addEventListener('click', copyHtml);
      this.shadow.querySelector('#btn-copy-html-inner').addEventListener('click', copyHtml);

      // Copy CSS
      const copyCss = () => this._copy(this.packageData.componentCss, 'CSS copied to clipboard!');
      this.shadow.querySelector('#btn-copy-css').addEventListener('click', copyCss);
      this.shadow.querySelector('#btn-copy-css-inner').addEventListener('click', copyCss);

      // Download ZIP
      this.shadow.querySelector('#btn-download-zip').addEventListener('click', () => {
        this._downloadZip();
      });
    }

    _copy(text, message) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => this._showToast(message));
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        this._showToast(message);
      }
    }

    _downloadZip() {
      try {
        const zip = new this.zipBuilder();
        zip.addFile('index.html', this.packageData.standaloneHtml);
        zip.addFile('style.css', this.packageData.componentCss);
        zip.addFile(
          'README.md',
          `# ${this.packageData.title}\n\nExtracted using Component Extractor for Firefox/Zen Browser.\n\n## Usage\nOpen index.html in any browser or copy component HTML and CSS into your project.\n`
        );

        const blob = zip.toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `component-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        this._showToast('📦 Downloaded component ZIP!');
      } catch (err) {
        console.error('[ComponentExtractor] ZIP download failed:', err);
        alert('Failed to generate ZIP archive: ' + err.message);
      }
    }

    _showToast(msg) {
      this.toast.textContent = msg;
      this.toast.classList.add('show');
      setTimeout(() => this.toast.classList.remove('show'), 2200);
    }

    _handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    }

    close() {
      window.removeEventListener('keydown', this._handleKeyDown, { capture: true });
      if (this.host && this.host.parentNode) {
        this.host.parentNode.removeChild(this.host);
      }
      this.host = null;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }



  // --- [Module: content.js] ---
  /**
   * Content Script Orchestrator
   * Coordinates inspector activation, element selection, style extraction, and preview presentation.
   */

  class ComponentExtractor {
    constructor() {
      this.inspector = null;
      this.activeModal = null;
    }

    toggle() {
      if (this.inspector && this.inspector.active) {
        this.cancel();
        return;
      }
      if (this.activeModal) {
        this.activeModal.close();
        this.activeModal = null;
        return;
      }
      this.start();
    }

    start() {
      if (this.activeModal) {
        this.activeModal.close();
        this.activeModal = null;
      }

      this.inspector = new InspectorOverlay(
        (element) => this.extract(element),
        () => {
          this.inspector = null;
        }
      );
      this.inspector.mount();
    }

    cancel() {
      if (this.inspector) {
        this.inspector.unmount();
        this.inspector = null;
      }
    }

    extract(element) {
      try {
        // 1. Tag info
        const tagName = element.tagName.toLowerCase();
        const firstClass = element.classList.length ? `.${element.classList[0]}` : '';
        const title = `<${tagName}${firstClass}> Component`;

        // 2. Clone DOM subtree and map elements
        const { clonedRoot, elementMap } = cloneAndCleanSubtree(element, 'ce');

        // 3. Extract CSS rules
        const cssRulesList = [];

        for (const [origEl, info] of elementMap.entries()) {
          const selector = `.${info.scopedClass}`;

          // Computed styles
          const styles = extractElementStyles(origEl);
          const rule = formatStylesToCssRules(selector, styles);
          if (rule) cssRulesList.push(rule);

          // Pseudo-elements ::before and ::after
          const beforeStyles = extractPseudoStyles(origEl, '::before');
          if (beforeStyles) {
            const beforeRule = formatStylesToCssRules(`${selector}::before`, beforeStyles);
            if (beforeRule) cssRulesList.push(beforeRule);
          }

          const afterStyles = extractPseudoStyles(origEl, '::after');
          if (afterStyles) {
            const afterRule = formatStylesToCssRules(`${selector}::after`, afterStyles);
            if (afterRule) cssRulesList.push(afterRule);
          }
        }

        // 4. Extract assets (fonts, images, SVGs)
        const assetData = extractAssets(element);

        // 5. Generate complete standalone HTML & CSS package
        const packageData = generateComponentPackage(clonedRoot, cssRulesList, {
          title,
          fonts: assetData.fontFamilies
        });

        // 6. Phase 2: React & Tailwind generation stubs
        const reactGen = new ReactGenerator({ componentName: 'ExtractedComponent' });
        const reactData = reactGen.generate(packageData);

        const twGen = new TailwindGenerator();
        const tailwindData = twGen.generatePreview(packageData);

        // 7. Render interactive preview modal
        this.activeModal = new PreviewModal(packageData, reactData, tailwindData, ZipBuilder);
        this.activeModal.show();
      } catch (err) {
        console.error('[ComponentExtractor] Extraction failed:', err);
        alert('Component extraction failed: ' + err.message);
      }
    }
  }

  // Global hook for extension triggers
  if (!window.__componentExtractor) {
    window.__componentExtractor = new ComponentExtractor();
  }
  window.__componentExtractor.start();


})();
