import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MCPOAuthProvider } from "./oauth_provider";
import { waitForCallback } from "../utils/waitForCallback";
import open from "open";

const CALLBACK_PORT = 8090;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;

export const mcp_client = new Client({
  name: "stass_client",
  version: "2.0.0",
});

let callbackPromise: Promise<string> | null = null;
let connectPromise: Promise<void> | null = null;

const oauthProvider = new MCPOAuthProvider(
  CALLBACK_URL,
  {
    client_name: "STASS MCP Client",
    redirect_uris: [CALLBACK_URL],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
  },
  (url) => {
    callbackPromise = waitForCallback();
    callbackPromise.catch(() => {}); // prevent unhandled rejection if SDK times out before we await it
    open(url.toString());
  },
);

export async function connectMCPClient(): Promise<void> {
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const transport = new StreamableHTTPClientTransport(
      new URL(process.env.MCP_URL || ""),
      { authProvider: oauthProvider },
    );

    try {
      await mcp_client.connect(transport);
      console.log("Connected to MCP server");
      return;
    } catch (error) {
      if (!callbackPromise) throw error;

      const code = await callbackPromise;
      await transport.finishAuth(code);
      const freshTransport = new StreamableHTTPClientTransport(
        new URL(process.env.MCP_URL || ""),
        { authProvider: oauthProvider },
      );
      await mcp_client.connect(freshTransport);
      console.log("Connected to MCP server after OAuth");
    }
  })();

  // reset promise on failure so we can retry
  connectPromise = connectPromise.catch((err) => {
    connectPromise = null;
    throw err;
  });

  return connectPromise;
}

export async function reconnectMCPClient(): Promise<void> {
  connectPromise = null;
  try {
    await mcp_client.close();
  } catch (_) {}
  return connectMCPClient();
}
