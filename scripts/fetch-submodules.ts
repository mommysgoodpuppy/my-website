/**
 * Materializes submodules from `submodules.lock.json` without needing a `.git`
 * directory in the working tree.
 *
 * Deno Deploy's Prepare stage downloads the source rather than cloning it, so
 * there are no gitlink entries and `git submodule update` fails outright. This
 * fetches each pinned commit directly instead. `git` itself is available in the
 * build image; only the parent repo's metadata is missing.
 *
 * Nested submodules are handled by git as usual: once a submodule is fetched it
 * has a real `.git` of its own, so `git submodule update --recursive` works
 * inside it.
 *
 * Existing non-empty checkouts are left alone, so this is a no-op locally.
 */

import { join } from "jsr:@std/path@^1.0.0";

interface Entry {
  path: string;
  url: string;
  sha: string;
}

async function run(args: string[], cwd?: string): Promise<boolean> {
  const { code } = await new Deno.Command("git", {
    args,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  }).output();
  return code === 0;
}

async function isPopulated(path: string): Promise<boolean> {
  try {
    for await (const _ of Deno.readDir(path)) return true;
    return false;
  } catch {
    return false;
  }
}

const lock: Entry[] = JSON.parse(
  await Deno.readTextFile("submodules.lock.json"),
);

for (const { path, url, sha } of lock) {
  if (await isPopulated(path)) {
    console.log(`= ${path} already present`);
    continue;
  }

  console.log(`\n> ${path} @ ${sha.slice(0, 8)} from ${url}`);
  await Deno.mkdir(path, { recursive: true });

  if (!await run(["init", "-q"], path)) {
    console.error(`failed to init ${path}`);
    Deno.exit(1);
  }
  if (!await run(["remote", "add", "origin", url], path)) {
    console.error(`failed to add remote for ${path}`);
    Deno.exit(1);
  }

  // GitHub allows fetching a bare SHA; fall back to a full fetch if the commit
  // isn't directly reachable (e.g. it was force-pushed past).
  let fetched = await run(["fetch", "--depth", "1", "origin", sha], path);
  if (!fetched) {
    console.warn(`  shallow fetch of ${sha.slice(0, 8)} failed, fetching all`);
    fetched = await run(["fetch", "origin"], path);
  }
  if (!fetched) {
    console.error(`failed to fetch ${path}`);
    Deno.exit(1);
  }

  if (!await run(["checkout", "-q", sha], path)) {
    console.error(`failed to check out ${sha} in ${path}`);
    Deno.exit(1);
  }

  // Nested submodules (mekgame -> ecctrl) resolve normally from here.
  try {
    await Deno.stat(join(path, ".gitmodules"));
    console.log(`  fetching nested submodules of ${path}`);
    if (!await run(["submodule", "update", "--init", "--recursive"], path)) {
      console.error(`failed to fetch nested submodules of ${path}`);
      Deno.exit(1);
    }
  } catch {
    // No nested submodules.
  }
}

console.log("\nsubmodules ready");
