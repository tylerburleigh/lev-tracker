import { NextResponse } from "next/server";

import { getEvidenceMapExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const exportData = await getEvidenceMapExport();

  return NextResponse.json(exportData, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
