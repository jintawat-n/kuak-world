#!/bin/bash
cd "$(dirname "$0")"
clear
echo "==================================="
echo "     OpenWorld - Pixel Life Online"
echo "==================================="
if [ ! -d node_modules ]; then
  echo "ติดตั้ง dependencies ครั้งแรก..."
  npm install --no-audit --no-fund
fi
export PORT=4488
node server/index.js
