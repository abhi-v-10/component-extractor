#!/usr/bin/env bash
# Build the Chrome Web Store upload: dist/swarm-rebuild-<version>.zip
# (manifest.json at the zip root, no repo-only files).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/swarm-rebuild"
version="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$src/manifest.json" | head -n 1)"
out="$root/dist/swarm-rebuild-$version.zip"

mkdir -p "$root/dist"
rm -f "$out"
if command -v zip >/dev/null 2>&1; then
  (cd "$src" && zip -r -X -q "$out" manifest.json background.js swarm.js icons -x '*.DS_Store')
  echo "Built $out"
  unzip -l "$out"
elif command -v python3 >/dev/null 2>&1; then
  python3 -c "
import zipfile, os
src, out = '$src', '$out'
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src):
        files = [f for f in files if not f.startswith('.') and f != 'Thumbs.db']
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            full = os.path.join(root, file)
            rel = os.path.relpath(full, src)
            zf.write(full, rel)
"
  echo "Built $out via python3 zipfile"
  python3 -c "import zipfile; [print(f'  {info.file_size:8d}  {info.filename}') for info in zipfile.ZipFile('$out').infolist()]"
else
  echo "Error: neither 'zip' nor 'python3' was found." >&2
  exit 1
fi

