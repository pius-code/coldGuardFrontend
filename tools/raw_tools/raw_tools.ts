import { scheduleSchema, ToolFxn } from "../../types/types";
import cron, { type ScheduledTask } from "node-cron";
import { QwenClient } from "../../core/groq";
import { get_tools } from "../../mcp_client/mcp_tools";
import { tool_call_result } from "../../mcp_client/mcp_tool_call_handler";
import client from "../../core/whatsapp";
import { getAgentWorkPrompt } from "../../prompts/sys_pro";
import { qwen_36_flash } from "../../model/model";

// for now it doesnt persist in a database, jobs will be destroyed upon restart
const cron_map: Record<string, ScheduledTask> = {};

export async function callAgentToWork(prompt: string) {
  try {
    const messages: any[] = [
      { role: "system", content: getAgentWorkPrompt() },
      { role: "user", content: prompt },
    ];
    const tools = await get_tools();

    let content = await QwenClient.responses.create({
      input: messages,
      model: qwen_36_flash,
      temperature: 1,
      top_p: 1,
      stream: false,
      tool_choice: "auto",
      tools,
    });

    console.log(
      "\n LLM Response from scsheduled agent:",
      JSON.stringify(content, null, 2),
    );

    let functionCalls = content.output.filter(
      (item: any) => item.type === "function_call",
    );

    while (functionCalls.length > 0) {
      const results = await Promise.all(
        functionCalls.map(async (call: any) => {
          const parsedArgs = JSON.parse(call.arguments);
          const result = await tool_call_result(call.name, parsedArgs);
          return { call, result };
        }),
      );

      for (const { call, result } of results) {
        // Push the function call itself so the model sees its own invocation
        messages.push(call);
        // Push the result in the format the Responses API expects
        const outputItem = {
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(result),
        };
        messages.push(outputItem);
      }

      content = await QwenClient.responses.create({
        input: messages,
        model: qwen_36_flash,
        temperature: 1,
        top_p: 1,
        stream: false,
        tool_choice: "auto",
        tools,
      });

      functionCalls = content.output.filter(
        (item: any) => item.type === "function_call",
      );
    }

    // Push the final assistant text message to your thread
    messages.push({ role: "assistant", content: content.output_text });

    const recipient = process.env.ALLOWED_NUMBER!;
    client.sendMessage(recipient, content.output_text);
  } catch (error) {
    const recipient = process.env.ALLOWED_NUMBER!;
    client.sendMessage(
      recipient,
      "Hey Something Happened while building the report, try again later!",
    );
    console.error("Error in CALLAGENTWORK Agent:", error);
  }
}

export async function createScheduledAgentTask(ScheduleSchema: scheduleSchema) {
  const cronJob = cron.schedule(ScheduleSchema.cron, () =>
    callAgentToWork(ScheduleSchema.prompt),
  );
  console.log("cronJob created :", cronJob);
  cron_map[ScheduleSchema.workflow_id] = cronJob;
  return "Scheduled successfully";
}

// * ===============================================================
// * TOOL FUNCTION REGISTRY
// * ===============================================================

export const clientToolRegistry: Record<string, ToolFxn> = {
  create_scheduled_agent_task: async (args) => {
    console.log("the agent just hit create scheduled task tool");
    const schema = {
      ...args,
      workflow_id: Math.random().toString(36).slice(2, 10),
    };
    return createScheduledAgentTask(schema as scheduleSchema);
  },
};
// * ==============================================================
// * ==============================================================
