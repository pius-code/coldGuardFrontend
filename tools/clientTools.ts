// client_tools.ts - raw tools defined locally in STASS
import { GroqTool } from "../mcp_client/mcp_tools";

export const clientTools: GroqTool[] = [
  {
    type: "function",
    name: "create_scheduled_agent_task",
    description:
      "Schedule the agent to run a task at a future time. " +
      "Use whenever the user mentions ANY future time — 'at 9pm', 'at 11:46 am', 'in 5 minutes', 'remind me', 'send me at X', 'by X time', 'tonight', 'tomorrow morning'. " +
      "If the user says 'give me a report at X' or 'I need X at Y time', they want it SCHEDULED — do NOT try to fetch current data. " +
      "Example: 'send me a drug report at 9pm' → call with cron='0 21 * * *', prompt='generate full drug viability report and send to user'",
    parameters: {
      type: "object",
      properties: {
        cron: {
          type: "string",
          description:
            "Cron expression for when to run. e.g. '0 21 * * *' for 9pm daily",
        },
        prompt: {
          type: "string",
          description:
            "Description of what the agent should do at the scheduled time",
        },
      },
      required: ["cron", "prompt"],
    },
    strict: false,
  },
];
