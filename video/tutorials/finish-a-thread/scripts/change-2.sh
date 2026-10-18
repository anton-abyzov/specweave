#!/bin/sh
# Take conflict on main: every greeting says "Hi" (same lines the thread changes for increment 0002).
set -eu
cd "$1"
printf 'export function greet(name = "world") {\n  return `Hi, ${name}!`;\n}\n' > src/greeting.js
sed -i '' -e 's/Hello there, world!/Hi, world!/' -e 's/Hello, Ada!/Hi, Ada!/' test/greeting.test.js
git diff --stat
