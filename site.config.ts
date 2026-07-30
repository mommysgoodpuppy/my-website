/**
 * Single source of truth for the site's routes.
 *
 * Both the generated homepage and the static build read from this list, so
 * adding a project here is all that's needed to publish it.
 */

export interface Route {
  /** Output path in the built site, e.g. "/golxr.html". */
  path: string;
  name: string;
  description: string;
  /**
   * Where the page comes from:
   *  - "bundle": a submodule with a vite build; its whole `dist/` is merged
   *    into the site root and `dist/index.html` becomes `path`.
   *  - "single": a self-contained index.html with no build step.
   */
  kind: "bundle" | "single";
  /** Submodule directory, relative to the repo root. */
  dir: string;
}

export const routes: Route[] = [
  {
    path: "/mapgame.html",
    name: "Map Game",
    description: "For gamemasters, Magic The Noah style map game",
    kind: "single",
    dir: "submodules/mapgame",
  },
  {
    path: "/jellysliderxr.html",
    name: "Jelly Slider XR",
    description: "Demo of webgpu, webxr made with typegpu",
    kind: "bundle",
    dir: "submodules/jellysliderxr",
  },
  {
    path: "/flickmouse.html",
    name: "Flick Mouse",
    description: "Flickable pointer demo with wowmouse touch-sdk",
    kind: "bundle",
    dir: "submodules/flickmouse",
  },
  {
    path: "/webxrbody.html",
    name: "WebXR Body",
    description: "WebXR body tracking demo",
    kind: "single",
    dir: "submodules/bodywebxr",
  },
  {
    path: "/golxr.html",
    name: "Game of Life XR",
    description: "Conway's Game of Life in WebXR",
    kind: "bundle",
    dir: "submodules/GOLXROG",
  },
  {
    path: "/mek.html",
    name: "mekgame",
    description: "webxr mech game in development",
    kind: "bundle",
    dir: "submodules/mekgame",
  },
];

/** The handle linked from the homepage's contact section. */
export const primaryHandle = "hotbloodedheroine.petplay.fi";
