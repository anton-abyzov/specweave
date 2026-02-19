import { describe, it, expect, vi, beforeEach } from "vitest";
import * as path from "path";

// ---------------------------------------------------------------------------
// Mock fs-native (specweave's fs abstraction)
// ---------------------------------------------------------------------------
const mockExistsSync = vi.fn();
const mockRmSync = vi.fn();
const mockRenameSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockUnlinkSync = vi.fn();
const mockReaddirSync = vi.fn();
const mockStatSync = vi.fn();

vi.mock("../../../src/utils/fs-native.js", () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  rmSync: (...args: unknown[]) => mockRmSync(...args),
  renameSync: (...args: unknown[]) => mockRenameSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
  readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
  statSync: (...args: unknown[]) => mockStatSync(...args),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  chmodSync: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock git-hooks-installer
// ---------------------------------------------------------------------------
const mockUninstallGitHooks = vi.fn();
const mockAreGitHooksInstalled = vi.fn();

vi.mock(
  "../../../src/cli/helpers/init/git-hooks-installer.js",
  () => ({
    uninstallGitHooks: (...args: unknown[]) => mockUninstallGitHooks(...args),
    areGitHooksInstalled: (...args: unknown[]) =>
      mockAreGitHooksInstalled(...args),
  }),
);

// ---------------------------------------------------------------------------
// Mock chalk (suppress colored output in tests)
// ---------------------------------------------------------------------------
vi.mock("chalk", () => {
  const passthrough = (s: string) => s;
  const chainable: Record<string, unknown> = {};
  for (const c of [
    "green",
    "red",
    "yellow",
    "blue",
    "cyan",
    "gray",
    "dim",
    "bold",
    "white",
    "magenta",
  ]) {
    chainable[c] = passthrough;
  }
  return { default: chainable, ...chainable };
});

// Import after mocks
const { uninstallCommand } = await import(
  "../../../src/cli/commands/uninstall.js"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PROJECT_PATH = "/test/project";

function setupBasicProject() {
  // .specweave/ exists
  mockExistsSync.mockImplementation((p: string) => {
    if (p.endsWith(".specweave")) return true;
    if (p.endsWith("vskill.lock")) return true;
    if (p.endsWith("CLAUDE.md")) return true;
    if (p.endsWith("AGENTS.md")) return true;
    return false;
  });

  // increments dir listing
  mockReaddirSync.mockReturnValue([]);

  // CLAUDE.md with SW sections only
  mockReadFileSync.mockImplementation((p: string) => {
    if (p.endsWith("CLAUDE.md")) {
      return `<!-- SW:META template="claude" version="1.0.0" sections="header" -->

<!-- SW:SECTION:header version="1.0.0" -->
**Framework**: SpecWeave
<!-- SW:END:header -->
`;
    }
    if (p.endsWith("AGENTS.md")) {
      return `<!-- SW:META template="agents" version="1.0.0" sections="header" -->

<!-- SW:SECTION:header version="1.0.0" -->
**Agents**: SpecWeave
<!-- SW:END:header -->
`;
    }
    if (p.endsWith("vskill.lock")) {
      return JSON.stringify({
        version: 1,
        agents: [],
        skills: {},
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
    }
    return "";
  });

  mockAreGitHooksInstalled.mockReturnValue(true);
  mockUninstallGitHooks.mockReturnValue(true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uninstallCommand", () => {
  it("removes .specweave/ directory", async () => {
    setupBasicProject();

    await uninstallCommand(PROJECT_PATH, { force: true });

    expect(mockRmSync).toHaveBeenCalledWith(
      path.join(PROJECT_PATH, ".specweave"),
      { recursive: true, force: true },
    );
  });

  it("archives .specweave/ with --keep-data", async () => {
    setupBasicProject();

    await uninstallCommand(PROJECT_PATH, { force: true, keepData: true });

    expect(mockRenameSync).toHaveBeenCalled();
    const renameCall = mockRenameSync.mock.calls[0];
    expect(renameCall[0]).toBe(path.join(PROJECT_PATH, ".specweave"));
    expect(renameCall[1]).toMatch(/\.specweave-backup-\d{8}T\d{6}/);
  });

  it("deletes CLAUDE.md when 100% SW-managed", async () => {
    setupBasicProject();

    await uninstallCommand(PROJECT_PATH, { force: true });

    // Should delete, not write
    expect(mockUnlinkSync).toHaveBeenCalledWith(
      path.join(PROJECT_PATH, "CLAUDE.md"),
    );
  });

  it("preserves user content in CLAUDE.md when mixed", async () => {
    setupBasicProject();

    // Override CLAUDE.md to have user content
    mockReadFileSync.mockImplementation((p: string) => {
      if (p.endsWith("CLAUDE.md")) {
        return `<!-- SW:META template="claude" version="1.0.0" sections="header" -->

<!-- SW:SECTION:header version="1.0.0" -->
**Framework**: SpecWeave
<!-- SW:END:header -->

## My Custom Rules

Always use tabs.
`;
      }
      if (p.endsWith("AGENTS.md")) {
        return `<!-- SW:META template="agents" version="1.0.0" sections="header" -->

<!-- SW:SECTION:header version="1.0.0" -->
test
<!-- SW:END:header -->
`;
      }
      if (p.endsWith("vskill.lock")) {
        return JSON.stringify({ version: 1, agents: [], skills: {} });
      }
      return "";
    });

    await uninstallCommand(PROJECT_PATH, { force: true });

    // Should write stripped content, not delete
    expect(mockWriteFileSync).toHaveBeenCalled();
    const writeCall = mockWriteFileSync.mock.calls.find((c: unknown[]) =>
      (c[0] as string).endsWith("CLAUDE.md"),
    );
    expect(writeCall).toBeDefined();
    expect(writeCall![1]).toContain("My Custom Rules");
    expect(writeCall![1]).toContain("Always use tabs");
    expect(writeCall![1]).not.toContain("SW:SECTION");
  });

  it("calls uninstallGitHooks", async () => {
    setupBasicProject();

    await uninstallCommand(PROJECT_PATH, { force: true });

    expect(mockUninstallGitHooks).toHaveBeenCalledWith(PROJECT_PATH);
  });

  it("deletes vskill.lock", async () => {
    setupBasicProject();

    await uninstallCommand(PROJECT_PATH, { force: true });

    expect(mockUnlinkSync).toHaveBeenCalledWith(
      path.join(PROJECT_PATH, "vskill.lock"),
    );
  });

  it("errors when .specweave/ does not exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await uninstallCommand(PROJECT_PATH, { force: true });

    expect(consoleSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("shows manifest without deleting in --dry-run mode", async () => {
    setupBasicProject();

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await uninstallCommand(PROJECT_PATH, { force: true, dryRun: true });

    // Should NOT delete anything
    expect(mockRmSync).not.toHaveBeenCalled();
    expect(mockUnlinkSync).not.toHaveBeenCalled();
    expect(mockRenameSync).not.toHaveBeenCalled();
    expect(mockUninstallGitHooks).not.toHaveBeenCalled();

    // Should print something
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
