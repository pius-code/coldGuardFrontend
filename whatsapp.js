import qrcode from "qrcode-terminal";
import { client } from "./core/whatsapp";

export function initializeWhatsApp() {
  console.log("Initializing WhatsApp connection...\n");
  client.on("qr", (qr) => {
    console.log("\n Scan this QR code with WhatsApp:\n");
    qrcode.generate(qr, { small: true });
    console.log(
      "\n Open WhatsApp > Settings > Linked Devices > Link a Device\n",
    );
  });

  // Event Listeners
  client.on("ready", () => {
    console.log("Event: WhatsApp Bot is ready!");
  });

  client.on("auth_failure", (msg) => {
    console.error("Event: Authentication failed:", msg);
  });

  client.on("disconnected", (reason) => {
    console.log("Event: WhatsApp disconnected:", reason);
  });

  client.initialize();
  return client;
}
