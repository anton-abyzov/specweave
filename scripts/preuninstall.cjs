#!/usr/bin/env node

/**
 * specweave preuninstall lifecycle script
 * Advises user to run specweave uninstall first and cleans up global cache
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const home = os.homedir();

console.log("\nspecweave: Uninstalling global CLI package...");
console.log("");
console.log("  If you have projects using SpecWeave, run this in each project first:");
console.log("    specweave uninstall");
console.log("");
console.log("  This removes .specweave/, cleans CLAUDE.md/AGENTS.md, and removes git hooks.");

// Clean specweave plugin cache
const cacheDir = path.join(home, ".claude", "plugins", "cache", "specweave");
try {
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log("\n  Cleaned plugin cache: " + cacheDir);
  }
} catch {
  // Ignore cleanup errors
}

console.log("");
