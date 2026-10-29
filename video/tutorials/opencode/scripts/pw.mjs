// Resolve Playwright from the project, else from the global npm root.
// PW_CHROMIUM overrides the browser binary when the resolved Playwright's own build is not installed.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
let mod;
try { mod = await import("playwright"); } catch {
  const root = execSync("npm root -g").toString().trim();
  mod = createRequire(root + "/")("playwright");
}
const base = mod.chromium;
export const chromium = process.env.PW_CHROMIUM
  ? { launch: (opts = {}) => base.launch({ ...opts, executablePath: process.env.PW_CHROMIUM }) }
  : base;
