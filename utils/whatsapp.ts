import { client } from "../core/whatsapp.ts";
import WAWebJS from "whatsapp-web.js";
const { MessageMedia } = WAWebJS;

export async function sendMessage(to: string, message: string) {
  await client.sendMessage(to, message);
}

export async function sendFile(
  to: string,
  buffer: Buffer,
  mimetype: string,
  filename: string,
  caption?: string,
) {
  const base64 = buffer.toString("base64");
  const media = new MessageMedia(mimetype, base64, filename);
  await client.sendMessage(to, media, { caption });
}
