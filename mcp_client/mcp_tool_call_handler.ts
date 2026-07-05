import { mcp_client, reconnectMCPClient } from "../core/fastmcp";
import { clientToolRegistry } from "../tools/raw_tools/raw_tools";
import { generateReportPDF } from "../utils/pdf";
import { extractMCPText } from "../utils/extractMCPText";
import { getActiveSender } from "../utils/redis";
import { sendFile } from "../utils/whatsapp";

const PDF_TOOLS = new Set(["build_vaccine_report"]);

export const tool_call_result = async (
  toolName: string,
  args: Record<string, unknown>,
  userId?: string,
) => {
  try {
    if (toolName in clientToolRegistry) {
      return clientToolRegistry[toolName](args);
    } else {
      const result = await mcp_client.callTool({ name: toolName, arguments: args }, undefined, { timeout: 900000 });

      if (PDF_TOOLS.has(toolName)) {
        const text = extractMCPText(result);
        const pdfBuffer = await generateReportPDF(text);
        const recipient = userId ?? await getActiveSender();
        if (recipient) {
          await sendFile(recipient, pdfBuffer, "application/pdf", "report.pdf", "Here is your report.");
        }
        return "Report generated and sent as PDF.";
      }

      return result;
    }
  } catch (error: any) {
    if (error?.code === 404) {
      await reconnectMCPClient();
      return await mcp_client.callTool({ name: toolName, arguments: args }, undefined, { timeout: 900000 });
    }
    console.error(`Error occurred while calling tool ${toolName}:`, error);
    throw error;
  }
};
