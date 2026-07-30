/**
 * Fails the build early if any submodule is missing its checkout.
 *
 * Without this, an empty submodule directory fails in confusing ways: vite
 * reports "0 modules transformed", and `cd submodules/x && deno task build`
 * finds no deno.json, walks up to the *root* config, and re-runs the root
 * build task in an infinite loop.
 */

import { routes } from "../site.config.ts";

/** Every path that must exist before any project build can run. */
const required = [
  ...routes.map((r) => `${r.dir}/index.html`),
  // mekgame depends on this nested submodule via a file: specifier.
  "submodules/mekgame/submodules/ecctrl/package.json",
];

const missing: string[] = [];
for (const path of required) {
  try {
    await Deno.stat(path);
  } catch {
    missing.push(path);
  }
}

if (missing.length > 0) {
  console.error("Missing submodule content:\n");
  for (const path of missing) console.error(`  ${path}`);
  console.error(
    "\nRun `deno task submodules` in a git clone," +
      "\nor `deno task fetchsubs` where there is no .git (Deno Deploy).",
  );
  Deno.exit(1);
}

console.log(`submodules ok (${required.length} paths)`);
