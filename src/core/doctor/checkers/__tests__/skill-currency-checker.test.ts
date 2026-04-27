import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SkillCurrencyChecker } from "../skill-currency-checker.js";

let projectRoot: string;

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), "vskill-scc-"));
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe("SkillCurrencyChecker", () => {
  it("skips when no vskill.lock is present in the project", async () => {
    const checker = new SkillCurrencyChecker();
    const result = await checker.check(projectRoot, {});
    expect(result.checks[0].status).toBe("skip");
    expect(result.checks[0].message).toMatch(/no vskill.lock in project/);
  });

  it("warns when vskill.lock exists but vskill CLI is unavailable", async () => {
    writeFileSync(join(projectRoot, "vskill.lock"), JSON.stringify({ skills: {} }));
    // Use a clearly nonexistent binary name to simulate "vskill not on PATH"
    const checker = new SkillCurrencyChecker({ vskillBin: "vskill-does-not-exist-2026" });
    const result = await checker.check(projectRoot, {});
    expect(result.checks[0].status).toBe("warn");
    expect(result.checks[0].message).toMatch(/vskill CLI not on PATH/);
    expect(result.checks[0].fixSuggestion).toBe("Install via: npm i -g vskill");
  });
});
