/**
 * Regenerates `submodules.lock.json` from the committed submodule pointers.
 *
 * Deno Deploy's Prepare stage downloads the source without a `.git` directory,
 * so the build has no gitlink entries to read and `git submodule` can't work.
 * The pinned commits have to travel as committed data instead.
 *
 * Run this after bumping any submodule, and commit the result.
 */

async function git(...args: string[]): Promise<string> {
  const { code, stdout, stderr } = await new Deno.Command("git", {
    args,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (code !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${new TextDecoder().decode(stderr)}`,
    );
  }
  return new TextDecoder().decode(stdout).trim();
}

interface Entry {
  path: string;
  url: string;
  sha: string;
}

// `ls-tree` reports the commit recorded in HEAD, which is what a fresh clone
// checks out — deliberately not the local working checkout, which may differ.
const tree = await git("ls-tree", "-r", "HEAD");
const gitlinks = new Map<string, string>();
for (const line of tree.split("\n")) {
  const m = line.match(/^160000 commit ([0-9a-f]{40})\t(.+)$/);
  if (m) gitlinks.set(m[2], m[1]);
}

const config = await git("config", "-f", ".gitmodules", "--list");
const urls = new Map<string, string>();
const paths = new Map<string, string>();
for (const line of config.split("\n")) {
  const m = line.match(/^submodule\.(.+)\.(path|url)=(.*)$/);
  if (!m) continue;
  const [, name, key, value] = m;
  if (key === "url") urls.set(name, value);
  else paths.set(name, value);
}

const entries: Entry[] = [];
for (const [name, path] of paths) {
  const url = urls.get(name);
  const sha = gitlinks.get(path);
  if (!url) throw new Error(`no url for submodule ${name}`);
  if (!sha) {
    console.warn(`skipping ${path}: not committed to HEAD yet`);
    continue;
  }
  entries.push({ path, url, sha });
}

entries.sort((a, b) => a.path.localeCompare(b.path));

await Deno.writeTextFile(
  "submodules.lock.json",
  JSON.stringify(entries, null, 2) + "\n",
);

console.log(`wrote submodules.lock.json (${entries.length} submodules)`);
for (const e of entries) console.log(`  ${e.path} @ ${e.sha.slice(0, 8)}`);

// Warn about local checkouts that have drifted from what will be deployed.
const status = await git("submodule", "status");
for (const line of status.split("\n")) {
  if (line.startsWith("+")) {
    console.warn(
      `\nwarning: ${line.trim().split(/\s+/)[1]} is checked out at a different` +
        " commit than HEAD records; commit the bump to deploy it.",
    );
  }
}
