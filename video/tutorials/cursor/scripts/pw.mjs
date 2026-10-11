// Resolve Playwright from the project, else from the global npm root.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
let mod;
try { mod = await import("playwright"); } catch {
  const root = execSync("npm root -g").toString().trim();
  mod = createRequire(root + "/")("playwright");
}
export const chromium = mod.chromium;
