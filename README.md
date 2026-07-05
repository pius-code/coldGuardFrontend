# ColdGuard WhatsApp Agent

ColdGuard is a hardware-powered cold-chain monitor for temperature-sensitive medical products (drugs, vaccines). It tracks temperature, humidity, and light exposure against a product's safe-storage profile and flags conditions that risk spoilage.

This repository is the **frontend interface** to ColdGuard: a WhatsApp bot that lets a healthcare worker talk to an AI agent in plain language, which in turn calls tools on the ColdGuard hardware/backend over the **Model Context Protocol (MCP)**. All reasoning is done by **Qwen** models via Alibaba Cloud's DashScope endpoint — no other LLM provider is used.

---

## How it works

```
WhatsApp user  <-->  whatsapp-web.js client  <-->  Qwen agent  <-->  MCP server  <-->  ColdGuard device/backend
                                                        |
                                                     Redis (conversation memory)
```

1. **WhatsApp in/out** — [core/whatsapp.ts](core/whatsapp.ts) and [whatsapp.js](whatsapp.js) start a `whatsapp-web.js` session (you scan a QR code once to link the device). Only messages from the number in `ALLOWED_NUMBER` are processed ([main.ts](main.ts)).
2. **MCP connection** — [core/fastmcp.ts](core/fastmcp.ts) opens a Streamable HTTP MCP connection to your ColdGuard MCP server (`MCP_URL`). If the server requires OAuth, [core/oauth_provider.ts](core/oauth_provider.ts) opens a browser window for one-time authorization and caches the resulting client info in `data/mcp_client_info.json`.
3. **Agent turn** — [handler/groq.ts](handler/groq.ts) builds the message list (system prompt + conversation history + the new message), fetches the available MCP tools ([mcp_client/mcp_tools.ts](mcp_client/mcp_tools.ts)), and calls the Qwen Responses API ([core/groq.ts](core/groq.ts)) with `tool_choice: "auto"`.
4. **Tool calls** — if Qwen decides it needs data or wants to act on the device, it returns a function call. [mcp_client/mcp_tool_call_handler.ts](mcp_client/mcp_tool_call_handler.ts) routes the call either to the MCP server (e.g. `get_sensor_data`) or to a locally-defined client tool (e.g. `create_scheduled_agent_task`). Results are fed back to Qwen, and this loop repeats until it produces a final answer.
5. **Reports** — some tools (e.g. `build_vaccine_report`) return long-form text that's rendered into a PDF ([utils/pdf.ts](utils/pdf.ts)) and sent back as a WhatsApp file attachment.
6. **Reply** — the final text response is sent back to the user on WhatsApp.

### Conversation memory

Each user's conversation history is stored in Redis, keyed by their WhatsApp ID, with a 24-hour TTL ([utils/redis.ts](utils/redis.ts)). Once a conversation grows past ~65 messages, older turns are automatically summarized by Qwen and replaced with a compact summary so the thread never blows past the model's context window.

Send the message `clear` at any time to wipe your history.

### Scheduled tasks

A user can ask for a recurring or future action (e.g. "send me a report every night at 9pm"). The agent calls `create_scheduled_agent_task`, which registers a cron job ([tools/raw_tools/raw_tools.ts](tools/raw_tools/raw_tools.ts)). When it fires, a fresh Qwen agent turn runs headlessly and messages the result back over WhatsApp. Scheduled jobs currently live in memory only and are lost on restart.

---

## Qwen models

All inference goes through a single OpenAI-compatible client pointed at Alibaba Cloud's DashScope endpoint ([core/groq.ts](core/groq.ts)):

| Model           | Used for                                                    |
| --------------- | ----------------------------------------------------------- |
| `qwen3.5-flash` | Main conversational agent                                   |
| `qwen3.6-flash` | Scheduled/background agent runs, conversation summarization |

Set `QWEN_API_KEY` in your `.env` to authenticate.

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

| Variable                        | Purpose                                      |
| ------------------------------- | -------------------------------------------- |
| `QWEN_API_KEY`                  | Alibaba Cloud DashScope API key              |
| `MCP_URL`                       | URL of your ColdGuard MCP server             |
| `REDIS_URL_LOCAL` / `REDIS_URL` | Redis instance for conversation history      |
| `ALLOWED_NUMBER`                | The only WhatsApp ID the bot will respond to |

### 3. Find your WhatsApp ID

Run the bot once, send it any message, and your ID will be printed to the console. Copy that value into `ALLOWED_NUMBER`.

### 4. Run

```bash
npm run dev
```

Scan the printed QR code with **WhatsApp > Linked Devices > Link a Device**. Once connected, the bot is live.

---

## Customizing the monitored product

The agent's knowledge of what's "safe" for the currently-monitored drug/vaccine lives in the system prompt at [prompts/sys_pro.ts](prompts/sys_pro.ts) (temperature range, humidity ceiling, degradation behavior, etc.). Update this profile to match whatever product ColdGuard is tracking.

---

## Notes & limitations

- Uses `whatsapp-web.js`, an unofficial WhatsApp Web client — suitable for a demo/hackathon deployment, not a production messaging channel.
- Scheduled jobs are in-memory and don't survive a restart.
