import pkg from "whatsapp-web.js";

const { Client, LocalAuth } = pkg;

export const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

export default client;
