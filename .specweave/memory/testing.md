# Testing Rules
> Project-specific patterns learned from corrections.
> Max 30 rules, auto-deduplicated.

- → use vi.fn() for mocks in Vitest, never jest.fn()
- → use os.tmpdir() for test temp files, not project cwd
