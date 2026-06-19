import { NextResponse } from "next/server";

import { getScopedEvidenceMapExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

type ScopedTrackExportRouteProps = {
  params: Promise<{
    trackId: string;
  }>;
};

export async function GET(_request: Request, { params }: ScopedTrackExportRouteProps) {
  const { trackId } = await params;
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
