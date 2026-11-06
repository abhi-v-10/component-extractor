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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TailwindGenerator, STATIC_PROPERTY_MAP };
}
