# Personal greeting

## Problem

greet() always says "Hello, world!". The welcome screen needs to greet people by name.

## Scope

In: an optional name argument to greet(). Out: translations.

## Acceptance Criteria

- [ ] AC-01: greet("Ada") returns "Hello, Ada!" and greet() still returns "Hello, world!"
- [ ] AC-02: a blank or whitespace-only name falls back to "Hello, world!"

## Approach

Change src/greeting.js and its test only. Trim the name before using it.

## Decisions

### Asked
- none
### Defaulted (change any before sw-do)
- none
### Open
- none

## Tasks

### T-01 Greet by name
- AC: AC-01, AC-02 | Files: src/greeting.js, test/greeting.test.js | Test: npm test
