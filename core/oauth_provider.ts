import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MCPOAuthProvider implements OAuthClientProvider {
  private _clientInformation?: OAuthClientInformationMixed;
  private _tokens?: OAuthTokens;
  private _codeVerifier?: string;
  private _onRedirect: (url: URL) => void;
  private readonly _clientInfoPath: string;

  constructor(
    private readonly _redirectUrl: string | URL,
    private readonly _clientMetadata: OAuthClientMetadata,
    onRedirect?: (url: URL) => void,
    clientInfoPath?: string,
  ) {
    this._onRedirect =
      onRedirect || ((url) => console.log(`Redirect to: ${url}`));
    this._clientInfoPath =
      clientInfoPath ??
      path.join(__dirname, "..", "data", "mcp_client_info.json");

    if (fs.existsSync(this._clientInfoPath)) {
      try {
        this._clientInformation = JSON.parse(
          fs.readFileSync(this._clientInfoPath, "utf8"),
        );
      } catch (err) {
        console.warn("Failed to load cached MCP client info", err);
      }
    }
  }

  get redirectUrl() {
    return this._redirectUrl;
  }
  get clientMetadata() {
    return this._clientMetadata;
  }
  clientInformation() {
    return this._clientInformation;
  }
  saveClientInformation(clientInformation: OAuthClientInformationMixed) {
    this._clientInformation = clientInformation;
    try {
      fs.mkdirSync(path.dirname(this._clientInfoPath), { recursive: true });
      fs.writeFileSync(
        this._clientInfoPath,
        JSON.stringify(clientInformation, null, 2),
        "utf8",
      );
    } catch (err) {
      console.warn("Failed to persist MCP client info", err);
    }
  }
  tokens() {
    return this._tokens;
  }
  saveTokens(tokens: OAuthTokens) {
    this._tokens = tokens;
  }
  redirectToAuthorization(url: URL) {
    this._onRedirect(url);
  }
  saveCodeVerifier(cv: string) {
    this._codeVerifier = cv;
  }
  codeVerifier() {
    if (!this._codeVerifier) throw new Error("No code verifier");
    return this._codeVerifier;
  }
}
