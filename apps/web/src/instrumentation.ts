export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.ENABLE_INGEST !== "false") {
    const { startIngestLoop } = await import("@bo-dash/ingest");
    startIngestLoop(Number(process.env.INGEST_INTERVAL_MS ?? 90000));
  }
}
