import { createServer } from "node:http";
const CALLBACK_PORT = 8090;

export async function waitForCallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.url === "/favicon.ico") {
        res.writeHead(404);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url || "", "http://localhost");
      const code = parsedUrl.searchParams.get("code");
      const error = parsedUrl.searchParams.get("error");

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Authorization Successful! You can close this tab.</h1>");
        setTimeout(() => server.close(), 1000);
        resolve(code);
      } else if (error) {
        res.writeHead(400);
        res.end(`<h1>Authorization Failed: ${error}</h1>`);
        reject(new Error(`OAuth failed: ${error}`));
      }
    });

    server.listen(CALLBACK_PORT, () => {
      console.log(`Waiting for OAuth callback on port ${CALLBACK_PORT}...`);
    });
  });
}
