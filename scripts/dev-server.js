#!/usr/bin/env node
/**
 * Zero-dependency local dev server with hot reload for testing extension demo & components.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const rootDir = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4'
};

// Simple SSE clients set for live reload
const sseClients = new Set();

// Watch dirs for changes
const watchDirs = [
  path.join(rootDir, 'demo'),
  path.join(rootDir, 'swarm-cursors', 'demo'),
  path.join(rootDir, 'swarm-cursors', 'swarm-rebuild')
];

let reloadTimeout = null;
watchDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      fs.watch(dir, { recursive: true }, (event, filename) => {
        if (!reloadTimeout) {
          reloadTimeout = setTimeout(() => {
            reloadTimeout = null;
            console.log(`[dev-server] File changed (${filename}), notifying clients...`);
            for (const client of sseClients) {
              client.write('data: reload\n\n');
            }
          }, 100);
        }
      });
    } catch (_) {}
  }
});

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // SSE endpoint for live reload
  if (urlPath === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Resolve file paths
  // Primary fallback check order:
  // 1. root demo folder
  // 2. swarm-cursors/demo folder
  // 3. swarm-cursors/swarm-rebuild (for swarm.js etc)
  // 4. root
  let targetPath = null;
  const cleanPath = urlPath === '/' ? '/index.html' : urlPath;

  const candidatePaths = [
    path.join(rootDir, 'demo', cleanPath),
    path.join(rootDir, 'component-extractor', cleanPath),
    path.join(rootDir, 'swarm-cursors', 'demo', cleanPath),
    path.join(rootDir, 'swarm-cursors', 'swarm-rebuild', cleanPath),
    path.join(rootDir, 'swarm-cursors', cleanPath),
    path.join(rootDir, cleanPath)
  ];


  for (const cand of candidatePaths) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      targetPath = cand;
      break;
    }
  }

  if (!targetPath) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${urlPath}`);
    return;
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    let content = fs.readFileSync(targetPath);

    // Inject live-reload script into HTML files
    if (ext === '.html') {
      const htmlStr = content.toString('utf8');
      const liveReloadScript = `
<!-- Dev Server Live Reload -->
<script>
  (() => {
    try {
      const evtSource = new EventSource('/__reload');
      evtSource.onmessage = (e) => {
        if (e.data === 'reload') {
          console.log('[dev-server] Reloading...');
          window.location.reload();
        }
      };
    } catch (_) {}
  })();
</script>
`;
      if (htmlStr.includes('</body>')) {
        content = Buffer.from(htmlStr.replace('</body>', `${liveReloadScript}</body>`));
      } else {
        content = Buffer.from(htmlStr + liveReloadScript);
      }
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Server Error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Dev server running at:`);
  console.log(`   👉 http://localhost:${PORT}/ (Component Demo & Playground)`);
  console.log(`   👉 http://localhost:${PORT}/components.html (Component Gallery)`);
  console.log(`\nHot reload is enabled for /demo and /swarm-rebuild changes.`);
  console.log(`Press Ctrl+C to stop.\n`);
});
