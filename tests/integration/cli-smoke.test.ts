import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "bun:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tempHomes: string[] = [];

function runCli(args: string[], homeDir: string): string {
  return execFileSync(process.execPath, ["run", "src/app/cli.ts", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: homeDir,
      USERPROFILE: homeDir,
    },
  }).trim();
}

describe("CLI smoke", () => {
  afterEach(() => {
    while (tempHomes.length > 0) {
      const dir = tempHomes.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  test("supports init -> create -> list through JSON and session tokens", { timeout: 15000 }, () => {
    const homeDir = mkdtempSync(join(tmpdir(), "agentwallet-cli-"));
    tempHomes.push(homeDir);

    const init = JSON.parse(runCli(["init", "--json"], homeDir)) as {
      token: string;
      recoveryKey: string;
      status: string;
    };
    expect(init.status).toBe("initialized");
    expect(init.token.startsWith("awlt_")).toBe(true);
    expect(init.recoveryKey.length).toBeGreaterThan(10);

    const created = JSON.parse(
      runCli(["create", "--chain", "base", "--token", init.token, "--json"], homeDir)
    ) as Array<{ chainId: string; address: string }>;
    expect(created).toHaveLength(1);
    expect(created[0]?.chainId).toBe("base");
    expect(created[0]?.address.startsWith("0x")).toBe(true);

    const listed = JSON.parse(runCli(["list", "--json"], homeDir)) as Array<{ address: string }>;
    expect(listed).toHaveLength(1);
    expect(listed[0]?.address).toBe(created[0]?.address);
  });
});
