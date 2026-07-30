# petplay.fi

r3f website project. A static site on Deno Deploy — each project lives in a git
submodule, and the build assembles them into `_site/`.

## Setup

```sh
git submodule update --init --recursive
```

## Build

```sh
deno task build     # builds every submodule, then assembles _site/
deno task serve     # serve _site/ locally
```

`deno task build` runs the four project builds, then `scripts/build-site.ts`,
which:

- generates the homepage from the route list in `site.config.ts`
- copies each project's built output in, renaming its `index.html` to the
  route's path (`submodules/GOLXROG/dist/index.html` -> `/golxr.html`)
- merges every project's `dist/` into the site root, so absolute `/assets/...`
  references keep resolving
- publishes the React/VRM app from `src/` under `/vrm/` (not linked from the
  homepage)

Adding a project means adding one entry to `routes` in `site.config.ts` — the
homepage and the file copying both read from it.

If two projects ship a file with the same name at the site root, the build
prints a `! collision` warning. Vite hashes bundle filenames, so in practice
this only affects hand-named files like favicons.

## Bluesky handle verification

The site used to serve `/.well-known/atproto-did`, returning a different DID
depending on which subdomain was requested. A static site can't vary a response
by `Host`, so verification happens over DNS instead. Both methods are equally
valid to atproto, and DNS is checked first.

Each handle needs a TXT record:

| name | type | value |
| --- | --- | --- |
| `_atproto.<handle>` | TXT | `did=<did>` |

Once these resolve, the three subdomains don't need to point at this deploy at
all. Check one with:

```sh
dig +short TXT _atproto.hotbloodedheroine.petplay.fi
```

## Deploy

Configured in the Deno Deploy dashboard:

| setting | value |
| --- | --- |
| Install Command | `deno task fetchsubs && deno task getbun` |
| Build Command | `deno task build` |
| Runtime | Static |
| Directory | `_site` |

Leave single-page-app mode **off** — each project is its own `.html`, so
unknown paths should 404 rather than serve the homepage.

### Why submodules are fetched manually

Deno Deploy's Prepare stage *downloads* the source rather than cloning it, so
the build tree has no `.git` directory. Without one there are no gitlink
entries and `git submodule update` fails outright:

```
fatal: not a git repository (or any of the parent directories): .git
```

So the pinned commits travel as committed data in `submodules.lock.json`, and
`deno task fetchsubs` fetches each one directly (`git` itself is present in the
build image — only the parent repo's metadata is missing). Nested submodules
resolve normally, because a freshly fetched submodule has a real `.git` of its
own.

**After bumping any submodule, run `deno task locksubs` and commit the
result** — otherwise the deploy keeps building the old pinned commit. It
records what's committed to `HEAD`, not your local checkout, and warns if the
two have drifted.

`fetchsubs` skips directories that already have content, so it's a no-op
locally; in a normal clone use `deno task submodules`. Either way
`deno task preflight` catches an empty checkout early with a readable error.

### Why bun is vendored

`mekgame` depends on its nested `ecctrl` submodule through a `file:` specifier,
and ecctrl's peer dependencies only resolve against bun's flat `node_modules`
layout. Deno Deploy has no bun, and its `node`, `npm`, `npx`, `yarn` and `pnpm`
are all shims over Deno — "all JavaScript inside of the builder is executed
using Deno" — so no package manager there can install it.

`deno task getbun` downloads the bun linux-x64 binary from its npm platform
package and extracts it to `.bun/` with `tar`. It no-ops on other platforms, so
locally the build just uses bun from PATH. `scripts/run-bun.ts` picks whichever
is available.

The bun version is pinned in `scripts/get-bun.ts`. The other three projects
build through Deno's npm support and need nothing extra.
