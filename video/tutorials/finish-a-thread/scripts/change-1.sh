#!/bin/sh
# Rehearsal conflict on main: the greeting wording changes to "Hello there", and increment 0002 is planned for the take.
set -eu
C="$1"; EP="$(cd "$(dirname "$0")/.." && pwd)"
cd "$C"
sed -i '' 's/Hello, /Hello there, /' src/greeting.js test/greeting.test.js
mkdir -p .specweave/increments/0002-greet-a-team
cp "$EP/captures/0002-spec.md" .specweave/increments/0002-greet-a-team/spec.md
python3 - <<'PY'
import json, datetime
now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
import uuid
m = {"id": "0002-greet-a-team", "uuid": str(uuid.uuid4()), "status": "active", "type": "feature", "priority": "P1", "created": now, "updated": now,
     "lastActivity": now, "title": "Greet a team", "project": "greet-app"}
open(".specweave/increments/0002-greet-a-team/metadata.json", "w").write(json.dumps(m, indent=2) + "\n")
PY
git diff --stat
