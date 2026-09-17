#!/bin/bash
cd "$(dirname "$0")" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v npm >/dev/null 2>&1; then
  echo 'Node.js is required. Install Node.js, then reopen this launcher.'
  read -r -p 'Press Return to close.'
  exit 1
fi
if [ ! -d node_modules ]; then
  echo 'Installing Asset Planner dependencies…'
  npm install || exit 1
fi
echo 'Open http://127.0.0.1:5173 in your browser. Keep this window open.'
npm run dev -- --port 5173 --strictPort
