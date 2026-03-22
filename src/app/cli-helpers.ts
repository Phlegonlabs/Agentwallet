import { password } from "@inquirer/prompts";
import { isVaultInitialized } from "../services/index.ts";
import { resolveAuth } from "../services/session-service.ts";
import { jsonErr } from "./json-output.ts";
import { hardenPermissions } from "../lib/index.ts";
import {
  getBaseDir,
  getVaultDir,
  VAULT_DIR_MODE,
  CONFIG_FILE_MODE,
} from "../config/index.ts";

/** Print error message (JSON or text) and exit */
export function fail(message: string, json?: boolean): never {
  if (json) jsonErr(message);
  process.stderr.write(message + "\n");
  process.exit(1);
}

/** Ensure vault is initialized or exit, silently fixing permissions */
export function requireVault(json?: boolean): void {
  if (!isVaultInitialized()) {
    fail("Vault not initialized. Run 'agentwallet init' first.", json);
  }
  hardenPermissions(getBaseDir(), getVaultDir(), VAULT_DIR_MODE, CONFIG_FILE_MODE);
}

/** Resolve auth from --token, AGENTWALLET_TOKEN env, or interactive password prompt */
export async function getAuth(opts: { token?: string }): Promise<string> {
  const token = opts.token || process.env.AGENTWALLET_TOKEN;
  if (token) {
    const result = await resolveAuth(token, async () => "");
    if (!result.ok) fail(result.error.message);
    return result.value;
  }
  const envKey = process.env.AGENTWALLET_RECOVERY_KEY;
  if (envKey) return envKey;
  const envPw = process.env.AGENTWALLET_PASSWORD;
  if (envPw) {
    process.stderr.write("Warning: AGENTWALLET_PASSWORD is deprecated. Use AGENTWALLET_RECOVERY_KEY instead.\n");
    return envPw;
  }
  return password({ message: "Enter recovery key:" });
}

/** Read JSON from --flag, stdin pipe, or return null */
export async function readJsonInput(flagValue?: string): Promise<string | null> {
  if (flagValue) return flagValue;
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf-8").trim();
  }
  return null;
}
