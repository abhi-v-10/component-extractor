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
