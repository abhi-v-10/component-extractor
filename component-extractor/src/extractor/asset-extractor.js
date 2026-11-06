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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractAssets,
    resolveUrl,
    isGenericFont
  };
}
