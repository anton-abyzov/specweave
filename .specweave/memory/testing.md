# Testing Rules
> Project-specific patterns learned from corrections.
> Max 30 rules, auto-deduplicated.

- → Use vi.fn() for mocks in Vitest, never jest.fn() - Vitest has its own mock implementation
- → Use os.tmpdir() for test temp files, not project cwd - avoids polluting the project directory
- → Use kebab-case for all file names in SpecWeave (e.g., `my-component.test.ts`)
- → always use it once you need by defualt to generate images and user didn't specify eplicilty how to g
