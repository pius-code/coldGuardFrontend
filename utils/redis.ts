import redis from "../core/redis_client";
import { QwenClient } from "../core/groq";
import { qwen_35_flash, qwen_36_flash } from "../model/model";

export async function getRedisUserHistory(userId: string) {
  const data = await redis?.get(userId);
  return data ? JSON.parse(data) : [];
}

// stores last 50 conversation for just 24 hours.
export async function addNewMessageAndUpdateHistory(
  userId: string,
  userMsg: string,
  assistantMsg: string,
  assistantRole: string = "assistant",
) {
  const history = await getRedisUserHistory(userId);
  history.push(
    { role: "user", content: userMsg },
    { role: assistantRole, content: assistantMsg },
  );

  const recent = history.slice(-50);
  console.log("Conversation history for", userId, ":", JSON.stringify(recent));
  await redis?.setex(userId, 86400, JSON.stringify(recent));
}

export async function storeActiveSender(userId: string) {
  await redis?.setex("last_sender", 86400, userId);
}

export async function getActiveSender(): Promise<string | null> {
  return (await redis?.get("last_sender")) ?? null;
}

export async function clearUserHistory(userId: string) {
  if (!redis) return { success: false, message: "Redis not available" };

  await redis.del(userId);
  console.log(`Cleared conversation for user: ${userId}`);
  return { success: true, message: "Conversation cleared" };
}

export async function addSingleMessageToHistory(
  userId: string,
  role: string,
  content: string,
) {
  const history = await getRedisUserHistory(userId);
  history.push({ role, content });
  const recent = history.slice(-50);
  await redis?.setex(userId, 86400, JSON.stringify(recent));
}

async function summarizeConversation(entries: any[]): Promise<string> {
  const readable = entries
    .map((m: any) => {
      if (m.role === "user") return `User: ${m.content}`;
      if (m.role === "assistant") return `Assistant: ${m.content}`;
      if (m.type === "function_call")
        return `[Tool called: ${m.name}(${m.arguments})]`;
      if (m.type === "function_call_output")
        return `[Tool result: ${m.output}]`;
      return null;
    })
    .filter(Boolean)
    .join("\n");

  const response = await QwenClient.chat.completions.create({
    model: qwen_36_flash,
    messages: [
      {
        role: "user",
        content: `Summarize this conversation concisely. Capture key facts, actions taken, device states, and any context needed for future exchanges:\n\n${readable}`,
      },
    ],
    max_tokens: 600,
  });

  return response.choices[0]?.message?.content ?? "No summary available.";
}

export async function saveUserHistory(userId: string, messages: any[]) {
  const historyToSave = messages.filter((m) => m.role !== "system");

  if (historyToSave.length >= 65) {
    const toSummarize = historyToSave.slice(0, -10);
    let recent = historyToSave.slice(-10);

    // Trim leading orphaned function_call/function_call_output entries so
    // the history always starts with a user message (Gemini requirement).
    while (recent.length > 0 && recent[0].role !== "user") {
      recent = recent.slice(1);
    }

    const summary = await summarizeConversation(toSummarize);

    const compactHistory = [
      {
        role: "user",
        content: `[Earlier conversation summary:\n${summary}]`,
      },
      {
        role: "assistant",
        content: "Got it, I have context from our earlier conversation.",
      },
      ...recent,
    ];

    console.log(
      `Summarized history for ${userId}: compressed to ${compactHistory.length} entries`,
    );
    await redis?.setex(userId, 86400, JSON.stringify(compactHistory));
    return;
  }

  console.log(
    "Conversation history for",
    userId,
    ":\n",
    JSON.stringify(historyToSave, null, 2),
  );
  await redis?.setex(userId, 86400, JSON.stringify(historyToSave));
}
