# Testing Rules
> Project-specific patterns learned from corrections.
> Max 30 rules, auto-deduplicated.

- → use vi.fn() for mocks in Vitest, never jest.fn()
- → use os.tmpdir() for test temp files, not project cwd
- ✗→✓ Always specify registry to avoid ~/
- → Wrong! Always use vi.fn() not jest.fn() with Vitest testing framework.
- → The convention here in SpecWeave is to use kebab-case for all file names.
