/**
 * Runs bun, preferring the copy vendored by `scripts/get-bun.ts`.
 *
 * Lets the same build task work locally (bun from PATH) and on Deno Deploy
 * (vendored into `.bun/`, since the build image has no bun). Arguments and the
 * working directory are passed straight through.
 */

import { fromFileUrl, join } from "jsr:@std/path@^1.0.0";

const repoRoot = fromFileUrl(new URL("..", import.meta.url));
const vendored = join(repoRoot, ".bun", "bin", "bun");

let bun = "bun";
try {
  await Deno.stat(vendored);
  bun = vendored;
} catch {
  // Not vendored — fall back to PATH.
}

const command = new Deno.Command(bun, {
  args: Deno.args,
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

let status;
try {
  status = await command.output();
} catch (err) {
  console.error(
    `run-bun: could not execute ${bun}: ${
      err instanceof Error ? err.message : err
    }`,
  );
  console.error(
    "Install bun (https://bun.sh) or run `deno task getbun` to vendor it.",
  );
  Deno.exit(1);
}

Deno.exit(status.code);
