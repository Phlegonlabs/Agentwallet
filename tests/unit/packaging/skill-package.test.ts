import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("skill packaging", () => {
  test("keeps the published root skill in sync with the repo-local skill", () => {
    const rootSkill = readFileSync(join(repoRoot, "SKILL.md"), "utf8");
    const repoSkill = readFileSync(join(repoRoot, "skills", "agentwallet", "SKILL.md"), "utf8");

    expect(normalizeLineEndings(rootSkill)).toBe(normalizeLineEndings(repoSkill));
  });

  test("includes both skill entrypoints in npm pack output", () => {
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    const result = spawnSync(npmCommand, ["pack", "--dry-run"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

    expect(output).toContain("SKILL.md");
    expect(output).toContain("skills/agentwallet/SKILL.md");
    expect(output).toContain("dist/app/cli.js");
  });
});

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}
