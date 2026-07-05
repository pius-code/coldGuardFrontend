import {
  connectMCPClient,
  mcp_client,
  reconnectMCPClient,
} from "../core/fastmcp";
import { clientTools } from "../tools/clientTools";

export type GroqTool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, any>;
  strict: boolean;
};

async function listToolsWithRetry() {
  try {
    return await mcp_client.listTools();
  } catch (error: any) {
    if (error?.code === 404) {
      await reconnectMCPClient();
      return await mcp_client.listTools();
    }
    throw error;
  }
}

export async function get_tools(): Promise<GroqTool[]> {
  // this is for openAI response endpoint
  await connectMCPClient();
  const tool_result = await listToolsWithRetry();
  const descriptionOverrides: Record<string, string> = {
    get_sensor_data:
      "Retrieve raw sensor readings (temperature, humidity, light). Call ONLY when the user asks for raw readings or specific values — NOT when they ask for a report. For reports, use build_vaccine_report instead.",
  };

  const mcp_tools = tool_result.tools.map(
    (tool): GroqTool => ({
      type: "function",
      name: tool.name,
      description: descriptionOverrides[tool.name] ?? tool.description ?? "",
      parameters: tool.inputSchema,
      strict: false,
    }),
  );
  return [...mcp_tools, ...clientTools];
}

export async function get_tools_2(): Promise<any[]> {
  // this one uses raw openAI chat.completions endpoint
  await connectMCPClient();
  const tool_result = await listToolsWithRetry();
  return tool_result.tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema,
    },
  }));
}
