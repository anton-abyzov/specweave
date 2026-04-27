import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PluginCurrencyChecker } from "../plugin-currency-checker.js";

let homeDir: string;
let projectRoot: string;

function writeJson(filePath: string, body: unknown): void {
  mkdirSync(filePath.substring(0, filePath.lastIndexOf("/")), { recursive: true });
  writeFileSync(filePath, JSON.stringify(body, null, 2));
}

beforeEach(() => {
  homeDir = mkdtempSync(join(tmpdir(), "vskill-pcc-"));
  projectRoot = mkdtempSync(join(tmpdir(), "vskill-pcc-proj-"));
});

afterEach(() => {
  rmSync(homeDir, { recursive: true, force: true });
  rmSync(projectRoot, { recursive: true, force: true });
});

describe("PluginCurrencyChecker", () => {
  it("skips gracefully when installed_plugins.json is absent", async () => {
    const checker = new PluginCurrencyChecker({ homeDir });
    const result = await checker.check(projectRoot, {});
    expect(result.checks[0].status).toBe("skip");
    expect(result.checks[0].message).toMatch(/no Claude Code plugins installed/);
  });

  it("reports pass when plugin install matches marketplace version", async () => {
    const installedPath = join(homeDir, ".claude/plugins/installed_plugins.json");
    writeJson(installedPath, {
      version: 2,
      plugins: {
        "sw@specweave": [
          {
            scope: "project",
            projectPath: "/foo",
            installPath: "/cache/sw/1.0.5",
            version: "1.0.5",
            installedAt: "2026-01-01T00:00:00Z",
            lastUpdated: "2026-01-01T00:00:00Z",
            gitCommitSha: "abc123",
          },
        ],
      },
    });

    const marketplaceLocation = join(homeDir, "marketplace-specweave");
    writeJson(join(homeDir, ".claude/plugins/known_marketplaces.json"), {
      specweave: {
        source: { source: "directory", path: marketplaceLocation },
        installLocation: marketplaceLocation,
        lastUpdated: "2026-01-01T00:00:00Z",
      },
    });

    const marketplaceJsonPath = join(marketplaceLocation, ".claude-plugin/marketplace.json");
    writeJson(marketplaceJsonPath, {
      name: "specweave",
      version: "1.0.5",
      plugins: [{ name: "sw", version: "1.0.5", source: "./plugins/sw" }],
    });

    const checker = new PluginCurrencyChecker({ homeDir });
    const result = await checker.check(projectRoot, {});
    expect(result.checks[0].status).toBe("pass");
    expect(result.checks[0].message).toMatch(/up to date/);
  });

  it("reports warn when plugin install is behind marketplace", async () => {
    const installedPath = join(homeDir, ".claude/plugins/installed_plugins.json");
    writeJson(installedPath, {
      version: 2,
      plugins: {
        "sw@specweave": [
          {
            scope: "user",
            installPath: "/cache/sw/1.0.0",
            version: "1.0.0",
            installedAt: "2026-01-01T00:00:00Z",
          },
        ],
      },
    });

    const marketplaceLocation = join(homeDir, "marketplace-specweave");
    writeJson(join(homeDir, ".claude/plugins/known_marketplaces.json"), {
      specweave: {
        source: { source: "directory", path: marketplaceLocation },
        installLocation: marketplaceLocation,
      },
    });

    writeJson(join(marketplaceLocation, ".claude-plugin/marketplace.json"), {
      name: "specweave",
      version: "1.0.5",
      plugins: [{ name: "sw", version: "1.0.5" }],
    });

    const checker = new PluginCurrencyChecker({ homeDir });
    const result = await checker.check(projectRoot, {});
    expect(result.checks[0].status).toBe("warn");
    expect(result.checks[0].message).toMatch(/1 plugin install\(s\) outdated/);
    expect(result.checks[0].fixSuggestion).toBe("Run: specweave refresh-plugins");
    expect(result.checks[0].details?.[0]).toMatch(/installed v1\.0\.0 -> latest v1\.0\.5/);
  });

  it("falls back to marketplace.version when plugins[].version is absent", async () => {
    const installedPath = join(homeDir, ".claude/plugins/installed_plugins.json");
    writeJson(installedPath, {
      version: 2,
      plugins: {
        "sw@specweave": [
          { scope: "project", installPath: "/cache/sw/1.0.0", version: "1.0.0" },
        ],
      },
    });
    const marketplaceLocation = join(homeDir, "marketplace-specweave");
    writeJson(join(homeDir, ".claude/plugins/known_marketplaces.json"), {
      specweave: { source: { source: "directory", path: marketplaceLocation }, installLocation: marketplaceLocation },
    });
    writeJson(join(marketplaceLocation, ".claude-plugin/marketplace.json"), {
      name: "specweave",
      version: "2.0.0",
      plugins: [{ name: "sw" }],
    });
    const checker = new PluginCurrencyChecker({ homeDir });
    const result = await checker.check(projectRoot, {});
    expect(result.checks[0].status).toBe("warn");
    expect(result.checks[0].details?.[0]).toMatch(/v2\.0\.0/);
  });

  it("skips entries whose marketplace is unknown without failing the run", async () => {
    const installedPath = join(homeDir, ".claude/plugins/installed_plugins.json");
    writeJson(installedPath, {
      version: 2,
      plugins: {
        "ghost@unknown-marketplace": [
          { scope: "project", installPath: "/x", version: "0.1.0" },
        ],
      },
    });
    writeJson(join(homeDir, ".claude/plugins/known_marketplaces.json"), {});
    const checker = new PluginCurrencyChecker({ homeDir });
    const result = await checker.check(projectRoot, {});
    // No checked entries → status becomes 'skip' (no plugins to check)
    expect(["skip", "pass"]).toContain(result.checks[0].status);
  });

  it("rejects malformed plugin keys without crashing", async () => {
    const installedPath = join(homeDir, ".claude/plugins/installed_plugins.json");
    writeJson(installedPath, {
      version: 2,
      plugins: {
        "no-at-sign-here": [{ scope: "project", installPath: "/x", version: "0.1.0" }],
      },
    });
    writeJson(join(homeDir, ".claude/plugins/known_marketplaces.json"), {});
    const checker = new PluginCurrencyChecker({ homeDir });
    const result = await checker.check(projectRoot, {});
    expect(result.status).not.toBe("fail");
  });
});
