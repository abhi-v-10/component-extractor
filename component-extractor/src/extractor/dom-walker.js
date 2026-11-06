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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cleanAttributes,
    cloneAndCleanSubtree
  };
}
