import { startIngestLoop } from "./index";

startIngestLoop(Number(process.env.INGEST_INTERVAL_MS ?? 25000));

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
