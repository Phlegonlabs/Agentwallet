import { Command } from "commander";
import { confirm, input } from "@inquirer/prompts";
import { deleteWallet, listWallets, isTotpEnabled, verifyTotp } from "../services/index.ts";
import { logAudit } from "../lib/index.ts";
import { ok, err, type Result } from "../types/index.ts";
import { fail } from "./cli-helpers.ts";
import { jsonOut } from "./json-output.ts";

export interface DeleteCommandOptions {
  force?: boolean;
  json?: boolean;
  totp?: string;
}

export async function authorizeDelete(
  options: DeleteCommandOptions & { address: string; chainName: string },
  dependencies: {
    isTty?: boolean;
    promptTotp?: () => Promise<string>;
    confirmDelete?: (message: string) => Promise<boolean>;
  } = {}
): Promise<Result<"authorized" | "cancelled">> {
  const isTty = dependencies.isTty ?? process.stdin.isTTY;

  if (isTotpEnabled()) {
    let code = options.totp?.trim();
    if (!code) {
      if (!isTty) {
        return err(new Error("TOTP is enabled. Provide --totp <code> for non-interactive delete."));
      }
      code = (await (dependencies.promptTotp ?? (() => input({ message: "Enter TOTP code:" })))()).trim();
    }

    const totpResult = await verifyTotp(code);
    if (!totpResult.ok) {
      return err(totpResult.error);
    }
  }

  if (!options.force) {
    if (!isTty) {
      return err(new Error("Non-interactive delete requires --force."));
    }

    const confirmed = await (
      dependencies.confirmDelete ??
      ((message: string) => confirm({ message, default: false }))
    )(`Delete ${options.chainName} wallet ${options.address}? This cannot be undone.`);

    if (!confirmed) {
      return ok("cancelled");
    }
  }

  return ok("authorized");
}

export function registerDeleteCommand(program: Command): void {
  program
    .command("delete <address>")
    .description("Securely delete a wallet")
    .option("--force", "Skip confirmation (required for non-interactive use)")
    .option("--totp <code>", "TOTP code for non-interactive delete when TOTP is enabled")
    .option("--json", "Output as JSON")
    .action(async (address: string, opts: DeleteCommandOptions) => {
      const wallets = listWallets();
      const wallet = wallets.find((item) => item.address.toLowerCase() === address.toLowerCase());
      if (!wallet) fail(`Wallet not found: ${address}`, opts.json);

      const authResult = await authorizeDelete({
        address,
        chainName: wallet.chainName,
        force: opts.force,
        json: opts.json,
        totp: opts.totp,
      });

      if (!authResult.ok) {
        logAudit("WALLET_DELETE", "failure", { address, reason: authResult.error.message });
        fail(authResult.error.message, opts.json);
      }

      if (authResult.value === "cancelled") {
        if (opts.json) return jsonOut({ status: "cancelled", address, chainId: wallet.chainId });
        process.stdout.write("Cancelled.\n");
        return;
      }

      const result = deleteWallet(address);
      if (!result.ok) {
        logAudit("WALLET_DELETE", "failure", { address });
        fail(result.error.message, opts.json);
      }

      logAudit("WALLET_DELETE", "success", { address, chainId: wallet.chainId });
      if (opts.json) return jsonOut({ status: "deleted", address, chainId: wallet.chainId });
      process.stdout.write(`Wallet ${address} securely deleted.\n`);
    });
}
