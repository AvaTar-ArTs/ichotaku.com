#!/bin/zsh
# One-click launcher for the Spiral-Sine flagship.
# Serves the whole ichotaku.com root (so ../sites, ../assets and the 62-page
# atlas resolve) and opens the flagship.
set -eu
SITE_DIR="/Users/steven/ichoTaKu.com"
SITE_PORT=4175
cd "$SITE_DIR"
python3 -m http.server "$SITE_PORT" --bind 127.0.0.1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM
sleep 1
open "http://127.0.0.1:$SITE_PORT/flagship-site/"
echo "flagship: http://127.0.0.1:$SITE_PORT/flagship-site/"
echo "atlas:    http://127.0.0.1:$SITE_PORT/"
wait "$SERVER_PID"
