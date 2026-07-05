import { initializeWhatsApp } from "./whatsapp.js";
import client from "./core/whatsapp";
import { Groq_LLMHandler } from "./handler/groq.js";
import { clearUserHistory, storeActiveSender } from "./utils/redis.js";
import { connectMCPClient } from "./core/fastmcp.js";

await connectMCPClient();
initializeWhatsApp();

const ALLOWED_NUMBER = process.env.ALLOWED_NUMBER;

client.on("message", async (message) => {
  console.log(message.from);
  if (message.from === ALLOWED_NUMBER) {
    await storeActiveSender(message.from);
    if (message.body.toLowerCase() === "clear") {
      await clearUserHistory(message.from);
      message.reply("Your conversation history has been cleared.");
      return;
    }
    console.log("Received message from specified number:", message.body);
    Groq_LLMHandler(message);
  }
});
