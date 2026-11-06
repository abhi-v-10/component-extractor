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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    indentHtml,
    generateComponentPackage
  };
}
