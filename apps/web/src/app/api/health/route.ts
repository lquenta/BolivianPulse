import { NextResponse } from "next/server";
import { getDashboardBundle } from "@/lib/bundle";

export const dynamic = "force-dynamic";

export async function GET() {
  const bundle = await getDashboardBundle();
  return NextResponse.json({
    generatedAt: bundle.generatedAt,
    sources: bundle.sourceHealth,
  });
}
