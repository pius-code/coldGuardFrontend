import PDFDocument from "pdfkit";
import { Writable } from "stream";

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "bullet"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "divider" };

function stripEmojis(text: string): string {
  return text.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu,
    "",
  ).trim();
}

function parseMarkdown(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: stripEmojis(trimmed.slice(4)) });
    } else if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: stripEmojis(trimmed.slice(3)) });
    } else if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: stripEmojis(trimmed.slice(2)) });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({ type: "bullet", text: stripEmojis(trimmed.slice(2)) });
    } else if (trimmed.match(/^[-*_]{3,}$/)) {
      blocks.push({ type: "divider" });
    } else {
      // strip inline bold/italic markers (**text** or *text*)
      const clean = stripEmojis(trimmed.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1"));
      blocks.push({ type: "paragraph", text: clean });
    }
  }

  return blocks;
}

export function generateReportPDF(markdownText: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    doc.pipe(stream);

    stream.on("finish", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);

    const blocks = parseMarkdown(markdownText);

    for (const block of blocks) {
      switch (block.type) {
        case "h1":
          doc.moveDown(0.5).font("Helvetica-Bold").fontSize(20).text(block.text);
          break;
        case "h2":
          doc.moveDown(0.5).font("Helvetica-Bold").fontSize(16).text(block.text);
          break;
        case "h3":
          doc.moveDown(0.3).font("Helvetica-Bold").fontSize(13).text(block.text);
          break;
        case "bullet":
          doc
            .font("Helvetica")
            .fontSize(11)
            .text(`• ${block.text}`, { indent: 20 });
          break;
        case "divider":
          doc
            .moveDown(0.3)
            .moveTo(50, doc.y)
            .lineTo(doc.page.width - 50, doc.y)
            .stroke()
            .moveDown(0.3);
          break;
        case "paragraph":
          doc.moveDown(0.2).font("Helvetica").fontSize(11).text(block.text);
          break;
      }
    }

    doc.end();
  });
}
