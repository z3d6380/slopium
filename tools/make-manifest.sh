#!/bin/bash
# Writes the Homebrew Channel manifest for the package that build-ipk.sh just built.
#   ./tools/make-manifest.sh      -> build/io.github.batmanrises.slopium.manifest.json
# The manifest holds the exact size and SHA-256 of the .ipk, so it must be regenerated for every release.
set -euo pipefail
cd "$(dirname "$0")/.."

APP_ID="io.github.batmanrises.slopium"
VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' app/appinfo.json | head -n1)"
IPK="build/${APP_ID}_${VERSION}_all.ipk"
[ -f "$IPK" ] || { echo "Build the package first: ./tools/build-ipk.sh" >&2; exit 1; }

SHA256="$(sha256sum "$IPK" | cut -d' ' -f1)"
SIZE="$(wc -c < "$IPK" | tr -d ' ')"

cat > "build/${APP_ID}.manifest.json" <<EOF
{
  "id": "${APP_ID}",
  "version": "${VERSION}",
  "type": "web",
  "title": "Slopium",
  "appDescription": "A calm home screen launcher for LG webOS TVs: clock, weather, apps and inputs, recent apps panel, wallpapers.",
  "iconUri": "https://raw.githubusercontent.com/z3d6380/slopium/main/repo/icon160.png",
  "sourceUrl": "https://github.com/z3d6380/slopium",
  "rootRequired": "optional",
  "ipkUrl": "https://github.com/z3d6380/slopium/releases/download/v${VERSION}/${APP_ID}_${VERSION}_all.ipk",
  "ipkSize": ${SIZE},
  "ipkHash": {
    "sha256": "${SHA256}"
  }
}
EOF
echo "Wrote build/${APP_ID}.manifest.json ($SIZE bytes, sha256 $SHA256)"
