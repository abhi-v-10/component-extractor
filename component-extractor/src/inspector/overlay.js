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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InspectorOverlay };
}
