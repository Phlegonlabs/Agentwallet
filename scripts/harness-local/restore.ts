#!/usr/bin/env bun
/**
 * Restore local harness files from manifest.
 * Run after cloning to regenerate managed files.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const manifestPath = join(import.meta.dir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.log("No manifest.json found. Run harness:hooks:install first.");
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
console.log(`Harness local manifest version: ${manifest.version}`);
console.log("Run 'bun harness:hooks:install' to restore all managed files.");
