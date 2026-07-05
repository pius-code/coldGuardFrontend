export type scheduleSchema = {
  workflow_id: string;
  cron: string;
  prompt: string;
};

export type ToolFxn = (args: Record<string, any>) => Promise<any>;
