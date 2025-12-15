// Define the mapping of subdomains to DIDs
const didMap: Record<string, string> = {
  "hotbloodedheroine.petplay.fi": "did:plc:n33fuccbgxbf2tj5bq7ekwha",
  "goodpuppies.petplay.fi": "did:plc:qge6rhexh43a7y6a7rk46izg",
  "mommysgoodpuppy.petplay.fi": "did:plc:ah3bzdmidpstq44hv5fp7enb",
};

// Route mappings: URL path -> route info
interface RouteInfo {
  name: string;
  description: string;
  filePath: string;
}

// Cache the generated home page HTML
let cachedHomePage: string | null = null;

const routeMap: Record<string, RouteInfo> = {
  "/mapgame.html": {
    name: "Map Game",
    description: "Interactive map-based game",
    filePath: "./submodules/mapgame/index.html",
  },
  "/jellysliderxr.html": {
    name: "Jelly Slider XR",
    description: "WebXR slider experiment with jelly physics",
    filePath: "./submodules/jellysliderxr/dist/index.html",
  },
  "/flickmouse.html": {
    name: "Flick Mouse",
    description: "Control your mouse with Touch SDK smartwatch",
    filePath: "./submodules/flickmouse/dist/index.html",
  },
  "/webxrbody.html": {
    name: "WebXR Body",
    description: "WebXR body tracking demo",
    filePath: "./submodules/bodywebxr/index.html",
  },
  "/golxr.html": {
    name: "Game of Life XR",
    description: "Conway's Game of Life in WebXR",
    filePath: "./submodules/GOLXROG/dist/index.html",
  },
};

// Helper function to get content type from file extension
function getContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    "html": "text/html",
    "js": "application/javascript",
    "css": "text/css",
    "json": "application/json",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "svg": "image/svg+xml",
  };
  return types[ext || ""] || "application/octet-stream";
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const host = request.headers.get("host") || "";

  // Handle the /.well-known/atproto-did endpoint
  if (url.pathname === "/.well-known/atproto-did") {
    const did = didMap[host];
    if (did) {
      return new Response(did, {
        headers: { "content-type": "text/plain" },
      });
    } else {
      return new Response("Not Found", { status: 404 });
    }
  }

  // Handle the home page - generate once and cache
  if (url.pathname === "/" || url.pathname === "/index.html") {
    if (!cachedHomePage) {
      const projectList = Object.entries(routeMap)
        .map(([path, info]) => `
        <li>
            <a href="${path}">${info.name}</a>
            <div class="description">${info.description}</div>
        </li>`)
        .join("");

      cachedHomePage = `<!DOCTYPE html>
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
        .description {
            color: #999;
            font-size: 14px;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <h1>My Projects & Demos</h1>
    <ul>${projectList}
    </ul>
</body>
</html>`;
    }

    return new Response(cachedHomePage, {
      headers: {
        "content-type": "text/html",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  // Check if the route is in the route map
  if (url.pathname in routeMap) {
    try {
      const filePath = routeMap[url.pathname].filePath;
      const html = await Deno.readTextFile(filePath);
      return new Response(html, {
        headers: {
          "content-type": "text/html",
          "cache-control": "public, max-age=3600",
        },
      });
    } catch (error) {
      console.error(`Error reading file for ${url.pathname}:`, error);
      return new Response("500 Internal Server Error", { status: 500 });
    }
  }

  // Serve robots.txt
  if (url.pathname === "/robots.txt") {
    try {
      const txt = await Deno.readTextFile("./robots.txt");
      return new Response(txt, {
        headers: { "content-type": "text/plain" },
      });
    } catch {
      return new Response("404 Not Found", { status: 404 });
    }
  }

  // Handle assets from any dist folder
  if (url.pathname.startsWith("/assets/")) {
    const possiblePaths = [
      `./submodules/jellysliderxr/dist${url.pathname}`,
      `./submodules/flickmouse/dist${url.pathname}`,
      `./submodules/GOLXROG/dist${url.pathname}`,
    ];

    for (const filePath of possiblePaths) {
      try {
        const file = await Deno.readFile(filePath);
        return new Response(file, {
          headers: {
            "content-type": getContentType(url.pathname),
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      } catch {
        // Try next path
        continue;
      }
    }

    return new Response("404 Not Found", { status: 404 });
  }

  // Handle all other routes
  return new Response("404 Not Found", { status: 404 });
}

console.log("Server running on http://localhost:8000");
await Deno.serve({ port: 8000 }, handleRequest);
