# Greet and farewell

## Problem

greet() always says "Hello, world!", and there is no way to say goodbye. The welcome screen needs both, by name.

## Scope

In: an optional name argument to greet(), and a new farewell(name). Out: translations.

## Acceptance Criteria

- [ ] AC-01: greet("Ada") returns "Hello, Ada!" and greet() still returns "Hello, world!"
- [ ] AC-02: farewell("Ada") returns "Goodbye, Ada!"

## Approach

Two independent tasks in separate files, so two workers can run them in parallel.

## Decisions

### Asked
- none
### Defaulted (change any before sw-do)
- none
### Open
- none

## Tasks

### T-01 Greet by name
- AC: AC-01 | Files: src/greeting.js, test/greeting.test.js | Test: node --test test/greeting.test.js

### T-02 Add farewell
- AC: AC-02 | Files: src/farewell.js, test/farewell.test.js | Test: node --test test/farewell.test.js
