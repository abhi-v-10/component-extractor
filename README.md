# Component Extractor & Swarm Rebuild Workspace

This repository houses two complementary browser extension systems:
1. **Component Extractor (`component-extractor/`)**: Visual UI component extractor for **Firefox / Zen Browser** (Manifest V3) that extracts any webpage element into standalone, production-ready HTML/CSS + ZIP download with live sandboxed preview and Phase 2 React/Tailwind architecture.
2. **Swarm Rebuild (`swarm-cursors/`)**: Multiplayer cursor swarm engine that blueprints web pages and rebuilds them live with simulated cursors.

---

## 🎯 Component Extractor (Firefox & Zen Browser)

### Features Implemented (Phase 1):
- **Element-Selection Mode**: Trigger via extension toolbar icon or <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd>.
- **Visual Hover Inspector**:
  - Outlines hovered elements with dimensions badge (`W × H px`), tag name, and class list.
  - Keyboard traversal: <kbd>↑</kbd> to select parent container, <kbd>↓</kbd> to select child element, <kbd>Esc</kbd> to cancel.
- **Deep Style & Layout Extraction**:
  - Traverses the entire DOM subtree (including open Shadow DOM roots).
  - Extracts computed styles for flexbox, grid, typography, colors, borders, shadows, backgrounds, and SVG properties.
  - Filters out redundant default browser styles to keep CSS clean and readable.
  - Extracts pseudo-elements (`::before` and `::after`).
  - Resolves relative URLs to absolute URLs.
  - Discovers web fonts and includes Google Fonts links automatically.
- **Interactive Code & Live Preview Modal**:
  - Completely isolated in its own Shadow DOM (no style bleed into or from host page).
  - 👁️ **Live Preview**: Sandboxed `<iframe>` rendering the extracted component.
  - 📄 **HTML Tab**: Formatted 2-space indented component HTML with one-click copy.
  - 🎨 **CSS Tab**: Scoped, formatted CSS rules with one-click copy.
  - ⚛️ **Phase 2 Tab**: Prepared React JSX template and Tailwind utility class conversion architecture.
  - 📦 **Download ZIP**: Generates and downloads a clean `component.zip` in-browser (containing `index.html`, `style.css`, and `README.md`) using pure JavaScript without external dependencies.
- **100% Local & Privacy-Preserving**: No backend, no telemetry, no AI APIs.

### Phase 2 Architecture (Prepared):
- **React Generator (`src/generators/react-generator.js`)**: Converts HTML into clean JSX with `className`, `htmlFor`, and self-closing tags.
- **Tailwind Generator (`src/generators/tailwind-generator.js`)**: Maps flex, grid, spacing, and typography properties into Tailwind CSS utility classes.

---

## 🚀 Quick Start & Development

### 1. Requirements
- Node.js (v18+)
- Python 3 (used by cross-platform packager for ZIP creation)

### 2. Available Scripts

| Command | Description |
|---|---|
| `npm test` | Runs the automated test suite (29 tests covering MV3, ZipBuilder, CSS/HTML/React/Tailwind) |
| `npm run check` | Validates MV3 manifests, icons, and runs JavaScript syntax checks |
| `npm run build` | Bundles and packages all extensions into release `.zip` files under `dist/` |
| `npm run build:extractor` | Bundles and packages `component-extractor-v1.0.0.zip` |
| `npm run bundle` | Rebuilds `component-extractor/extractor.js` from modular source files |
| `npm run dev` (or `npm start`) | Starts local development server at `http://localhost:3000` with hot reload |

---

## 🧩 Installing into Firefox / Zen Browser

1. Open **Zen Browser** (or **Firefox**).
2. In the URL bar, go to:
   ```
   about:debugging#/runtime/this-firefox
   ```
3. Click the **Load Temporary Add-on...** button.
4. Navigate to this project folder and select:
   ```
   component-extractor/manifest.json
   ```
5. The **Component Extractor** extension is now loaded!
6. Visit any website (or test with `http://localhost:3000/components.html`).
7. Press <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd> or click the extension icon to begin visually extracting components.

---

## 📁 Repository Structure

```
component_render_extension/
├── package.json                    # Workspace scripts (test, check, build, dev)
├── component-extractor/            # Firefox / Zen Browser Extension (MV3)
│   ├── manifest.json               # Manifest V3 with Gecko ID
│   ├── background.js               # Background script
│   ├── extractor.js                # Standalone content script bundle
│   ├── icons/                      # 16, 32, 48, 128px PNG icons
│   └── src/                        # Modular source files
│       ├── content.js              # Content script orchestrator
│       ├── inspector/overlay.js    # Visual highlight box, badges, keyboard navigation
│       ├── extractor/
│       │   ├── dom-walker.js       # Subtree cloning, sanitization & Shadow DOM support
│       │   ├── css-extractor.js    # Computed styles, pseudo-elements & URL resolution
│       │   └── asset-extractor.js  # Images, SVGs, and web fonts discovery
│       ├── generators/
│       │   ├── html-generator.js   # Standalone HTML + CSS package generator
│       │   ├── react-generator.js  # Phase 2 React/JSX component architecture
│       │   └── tailwind-generator.js # Phase 2 Tailwind CSS conversion architecture
│       ├── ui/preview-modal.js     # Sandboxed preview, tabs, copy, and ZIP download
│       └── utils/zip-builder.js    # Pure JS standard PKZip generator
├── swarm-cursors/                  # Swarm Rebuild project (reference)
├── demo/                           # Interactive test playground
│   ├── components.html             # Component Render Studio (Cards, Dashboard, Forms)
│   └── index.html                  # Acme demo app
├── scripts/
│   ├── build.js                    # Cross-platform release packager
│   ├── build-extractor.js          # Bundler for extractor.js
│   ├── check.js                    # Manifest & syntax validator
│   ├── dev-server.js               # Local dev server with live reload
│   └── generate-icons.py           # Procedural PNG icon generator
└── tests/
    └── run-tests.js                # Automated test suite (29 tests)
```

---

## ⚠️ Known Limitations & Graceful Handling
- **Cross-Origin Iframes**: Browsers enforce strict cross-origin iframe security (`SecurityError` when accessing `contentDocument`). These regions are gracefully preserved as iframe references or placeholder containers.
- **Canvas / WebGL**: Dynamic GPU canvases cannot be serialized into static HTML/CSS; they are captured with dimensions preserved.
- **CSS Transitions/Hover States**: Phase 1 extracts static computed styles at selection time. Interactive hover/focus state variants are planned for Phase 2.
