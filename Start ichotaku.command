#!/bin/zsh
set -eu
SITE_DIR="/Users/steven/ichotaku.com"
SITE_PORT=4174
cd "$SITE_DIR"
python3 -m http.server "$SITE_PORT" --bind 127.0.0.1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM
sleep 1
open "http://127.0.0.1:$SITE_PORT/"
wait "$SERVER_PID"
