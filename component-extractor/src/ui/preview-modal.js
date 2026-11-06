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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PreviewModal, escapeHtml };
}
