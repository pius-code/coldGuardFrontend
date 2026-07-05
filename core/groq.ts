// dont let the name groq confuse you

import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export const QwenClient = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL:
    "https://ws-n5t9fuur0k5rnpm2.ap-southeast-1.maas.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1",
});
