// Define the mapping of subdomains to DIDs
const didMap: Record<string, string> = {
    "hotbloodedheroine.petplay.fi": "did:plc:n33fuccbgxbf2tj5bq7ekwha",
    "goodpuppies.petplay.fi": "did:plc:qge6rhexh43a7y6a7rk46izg"
};

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

    // Handle the root and index.html as before
    if (url.pathname === "/" || url.pathname === "/index.html") {
        try {
            const html = await Deno.readTextFile("./index.html");
            return new Response(html, {
                headers: { "content-type": "text/html" },
            });
        } catch (error) {
            console.error("Error reading file:", error);
            return new Response("500 Internal Server Error", { status: 500 });
        }
    }

    if (url.pathname === "/webxrbody.html") {
        try {
            const html = await Deno.readTextFile("./webxrbody.html");
            return new Response(html, {
                headers: { "content-type": "text/html" },
            });
        } catch (error) {
            console.error("Error reading file:", error);
            return new Response("500 Internal Server Error", { status: 500 });
        }
    }

    // Handle all other routes
    return new Response("404 Not Found", { status: 404 });
}

console.log("Server running on http://localhost:8000");
await Deno.serve({ port: 8000 }, handleRequest);
