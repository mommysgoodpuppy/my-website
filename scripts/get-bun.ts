/**
 * Vendors the bun binary into `.bun/` for the Deno Deploy build.
 *
 * mekgame needs bun specifically: it depends on the nested `ecctrl` submodule
 * through a `file:` specifier, and ecctrl's peer dependencies only resolve
 * against bun's flat node_modules layout. Deno's isolated layout can't see
 * them, and Deno Deploy's `node`/`npm`/`pnpm` are all shims over Deno, so
 * there's no package manager in the build image that can install it.
 *
 * The npm platform package ships the raw binary in a .tgz, and both `deno` and
 * `tar` are guaranteed present in the build image.
 *
 * No-ops anywhere except linux x64 (what Deno Deploy builds on); elsewhere the
 * build uses bun from PATH. Set FORCE_BUN_FETCH=1 to override.
 */

const BUN_VERSION = "1.3.14";
const DEST = ".bun";
const BIN = `${DEST}/bin/bun`;

function supported(): boolean {
  if (Deno.env.get("FORCE_BUN_FETCH") === "1") return true;
  return Deno.build.os === "linux" && Deno.build.arch === "x86_64";
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

if (!supported()) {
  console.log(
    `get-bun: skipping on ${Deno.build.os}/${Deno.build.arch}; using bun from PATH`,
  );
  Deno.exit(0);
}

if (await exists(BIN)) {
  console.log(`get-bun: ${BIN} already present`);
  Deno.exit(0);
}

const url =
  `https://registry.npmjs.org/@oven/bun-linux-x64/-/bun-linux-x64-${BUN_VERSION}.tgz`;
console.log(`get-bun: downloading bun ${BUN_VERSION}`);

const res = await fetch(url);
if (!res.ok) {
  console.error(`get-bun: download failed: ${res.status} ${res.statusText}`);
  Deno.exit(1);
}

const tgz = await Deno.makeTempFile({ suffix: ".tgz" });
await Deno.writeFile(tgz, new Uint8Array(await res.arrayBuffer()));

await Deno.mkdir(DEST, { recursive: true });

// The tarball is package/bin/bun + package/package.json; strip the wrapper.
const tar = new Deno.Command("tar", {
  args: ["-xzf", tgz, "-C", DEST, "--strip-components=1"],
  stdout: "inherit",
  stderr: "inherit",
});
const { code } = await tar.output();
await Deno.remove(tgz);

if (code !== 0) {
  console.error("get-bun: tar extraction failed");
  Deno.exit(code);
}

if (Deno.build.os !== "windows") {
  await Deno.chmod(BIN, 0o755);
}

if (!(await exists(BIN))) {
  console.error(`get-bun: expected ${BIN} after extraction`);
  Deno.exit(1);
}

console.log(`get-bun: installed ${BIN}`);
