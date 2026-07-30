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

Run `deno task dns` to print the exact records, or read them from `handleDids`
in `site.config.ts`. Each handle needs:

| name | type | value |
| --- | --- | --- |
| `_atproto.<handle>` | TXT | `did=<did>` |

Once these resolve, the three subdomains don't need to point at this deploy at
all. Check one with:

```sh
dig +short TXT _atproto.hotbloodedheroine.petplay.fi
```

## Deploy

`deno.json` configures Deno Deploy directly:

```json
"deploy": {
  "build": "deno task build",
  "runtime": { "type": "static", "cwd": "_site" }
}
```

The build needs `deno` and `bun` — `mekgame` aliases vite to `rolldown-vite`
and depends on a nested submodule via `file:`, which npm's resolver can't
install, so it uses `bun install`. The other three build through Deno's npm
support.
