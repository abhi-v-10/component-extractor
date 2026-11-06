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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RELEVANT_PROPERTIES,
    DEFAULT_VALUES,
    extractElementStyles,
    extractPseudoStyles,
    formatStylesToCssRules,
    resolveCssUrls
  };
}
