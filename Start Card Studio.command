#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
cardstudio_bun="$(command -v bun || true)"
if [[ -z "$cardstudio_bun" && -x "$HOME/.bun/bin/bun" ]]; then
  cardstudio_bun="$HOME/.bun/bin/bun"
fi
if [[ -z "$cardstudio_bun" ]]; then
  print "Bun is required. Install it from https://bun.sh and run this launcher again."
  read -r "?Press Enter to close."
  exit 1
fi
if /usr/bin/curl --max-time 2 -fsS http://localhost:3217/api/status >/dev/null 2>&1; then
  /usr/bin/open 'http://localhost:3217/?layout=madar'
  exit 0
fi
if [[ ! -d node_modules ]]; then
  "$cardstudio_bun" install --frozen-lockfile
fi
(sleep 2; /usr/bin/open 'http://localhost:3217/?layout=madar') &
print 'Keep this terminal open while using Card Studio. Press Control-C to stop.'
exec "$cardstudio_bun" run start
