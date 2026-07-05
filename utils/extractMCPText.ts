export function extractMCPText(result: any): string {
  try {
    const text = result?.content
      ?.filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
    if (text) return text;
  } catch {}
  return JSON.stringify(result);
}
