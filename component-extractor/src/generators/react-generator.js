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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReactGenerator };
}
