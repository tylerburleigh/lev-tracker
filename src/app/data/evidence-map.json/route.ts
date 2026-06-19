import { NextResponse } from "next/server";

import { getEvidenceMapExport, getScopedEvidenceMapExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const trackId = new URL(request.url).searchParams.get("track");

  if (trackId) {
    const scopedExport = await getScopedEvidenceMapExport(trackId);

    if (!scopedExport) {
      return NextResponse.json(
        {
          error: "Track not found",
          track: trackId
        },
        { status: 404 }
      );
    }

    return NextResponse.json(scopedExport, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }

  const exportData = await getEvidenceMapExport();

  return NextResponse.json(exportData, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
