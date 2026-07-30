/**
 * Assembles the static site into `_site/`.
 *
 * Everything the old `staging/serve.ts` did at request time now happens here at
 * build time: the homepage is generated from the route manifest, each project's
 * built output is copied in, and their `assets/` folders are merged at the site
 * root (which is what the old server's multi-path asset lookup emulated).
 */

import { emptyDir, ensureDir, walk } from "jsr:@std/fs@^1.0.0";
import { dirname, join, relative } from "jsr:@std/path@^1.0.0";
import { primaryHandle, type Route, routes } from "../site.config.ts";

const OUT = "_site";

/** Top-level entries in a source dir that are never part of the site. */
const SKIP = new Set([".git", ".gitignore", "README.md", "readme.md"]);

/** Tracks which route wrote each output file, so collisions are visible. */
const writtenBy = new Map<string, string>();

interface CopyOptions {
  /** Rename the source's index.html to this path, e.g. "golxr.html". */
  indexTarget?: string;
  /** Nest everything under this subdirectory of the output. */
  prefix?: string;
}

async function copyInto(srcDir: string, label: string, opts: CopyOptions = {}) {
  for await (const entry of walk(srcDir, { includeDirs: false })) {
    const rel = relative(srcDir, entry.path).replaceAll("\\", "/");
    const top = rel.split("/")[0];
    if (SKIP.has(top)) continue;

    // A bundle's index.html becomes the route's page (e.g. /golxr.html);
    // everything else keeps its path so absolute /assets/... refs resolve.
    let dest = rel === "index.html" && opts.indexTarget ? opts.indexTarget : rel;
    if (opts.prefix) dest = `${opts.prefix}/${dest}`;

    const prev = writtenBy.get(dest);
    if (prev && prev !== label) {
      console.warn(
        `  ! collision: ${dest} written by both ${prev} and ${label}`,
      );
    }
    writtenBy.set(dest, label);

    const destPath = join(OUT, dest);
    await ensureDir(dirname(destPath));
    await Deno.copyFile(entry.path, destPath);
  }
}

async function buildRoute(route: Route) {
  const srcDir = route.kind === "bundle" ? join(route.dir, "dist") : route.dir;

  try {
    const stat = await Deno.stat(srcDir);
    if (!stat.isDirectory) throw new Error("not a directory");
  } catch {
    throw new Error(
      `${route.name}: missing ${srcDir}. ` +
        (route.kind === "bundle"
          ? "Did its build task run?"
          : "Is the submodule checked out? Try `git submodule update --init`."),
    );
  }

  await copyInto(srcDir, route.name, {
    indexTarget: route.path.replace(/^\//, ""),
  });
  console.log(`  + ${route.path.padEnd(20)} <- ${srcDir}`);
}

function renderHomePage(): string {
  const projectList = routes
    .map(
      (r) => `
      <li>
        <a href="${r.path}">${r.name}</a>
        <div class="description">${r.description}</div>
      </li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Projects</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #1a1a1a;
            color: #e0e0e0;
        }
        h1 {
            color: #fff;
            border-bottom: 2px solid #444;
            padding-bottom: 10px;
        }
        ul {
            list-style: none;
            padding: 0;
        }
        li {
            margin: 15px 0;
        }
        a {
            color: #58a6ff;
            text-decoration: none;
            font-size: 18px;
            display: block;
            padding: 12px;
            background: #2a2a2a;
            border-radius: 6px;
            transition: background 0.2s;
        }
        a:hover {
            background: #333;
        }
        .contact a {
            display: inline;
            padding: 0;
            background: none;
            border-radius: 0;
        }
        .contact a:hover {
            background: none;
            text-decoration: underline;
        }
        .description {
            color: #999;
            font-size: 14px;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <h1>My Projects &amp; Demos</h1>
    <ul>${projectList}
    </ul>
    <hr style="border: 1px solid #444; margin: 40px 0;">
    <h2>Contact</h2>
    <ul class="contact">
        <li><strong>Bluesky:</strong> <a href="https://bsky.app/profile/${primaryHandle}" target="_blank">${primaryHandle}</a></li>
        <li><strong>GitHub:</strong> <a href="https://github.com/mommysgoodpuppy" target="_blank">github.com/mommysgoodpuppy</a></li>
        <li><strong>Discord:</strong> theelectronicfreezer</li>
    </ul>
</body>
</html>
`;
}

async function main() {
  console.log(`Assembling ${OUT}/`);
  await emptyDir(OUT);

  for (const route of routes) {
    await buildRoute(route);
  }

  // The React/VRM app isn't linked from the homepage, but keep publishing it.
  // It lives under /vrm/ so its assets/ don't collide with the projects'.
  try {
    await copyInto("dist", "vrm app", { prefix: "vrm" });
    console.log("  + /vrm/               <- dist");
  } catch {
    console.warn("  ! skipping vrm app: dist/ not found");
  }

  await Deno.writeTextFile(join(OUT, "index.html"), renderHomePage());
  console.log("  + /                  <- generated from site.config.ts");

  await Deno.copyFile("robots.txt", join(OUT, "robots.txt"));
  console.log("  + /robots.txt");

  console.log(`\nDone. ${writtenBy.size + 2} files in ${OUT}/`);
}

if (import.meta.main) {
  await main();
}
