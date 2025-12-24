#!/usr/bin/env bash
set -euo pipefail

REQUIRED_NODE_MAJOR=20

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Please install Node.js ${REQUIRED_NODE_MAJOR} or newer (e.g., via nvm) and re-run setup.sh." >&2
  exit 1
fi

CURRENT_NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$CURRENT_NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  if command -v nvm >/dev/null 2>&1; then
    echo "Detected Node.js $CURRENT_NODE_MAJOR; installing Node.js ${REQUIRED_NODE_MAJOR} via nvm..."
    nvm install "$REQUIRED_NODE_MAJOR"
    nvm use "$REQUIRED_NODE_MAJOR"
  else
    echo "Error: Node.js $CURRENT_NODE_MAJOR detected, but Node.js ${REQUIRED_NODE_MAJOR}+ is required." >&2
    echo "Install nvm (https://github.com/nvm-sh/nvm) and run: nvm install ${REQUIRED_NODE_MAJOR} && nvm use ${REQUIRED_NODE_MAJOR}" >&2
    exit 1
  fi
fi

echo "Installing project dependencies..."
npm install

echo "Syncing Capacitor platforms..."
npm run cap:sync

echo "Building web assets..."
npm run build

echo "Copying web assets to native platforms..."
npm run cap:copy

echo "Opening Android project (if available)..."
npm run cap:open

echo "Starting development server..."
npm start
