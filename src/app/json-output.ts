/** Write JSON to stdout and exit cleanly */
export function jsonOut(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

/** Write JSON error to stderr and exit */
export function jsonErr(message: string, code = 1): never {
  process.stderr.write(JSON.stringify({ error: message }) + "\n");
  process.exit(code);
}
