import { NextResponse } from "next/server";

import { type EvidenceConflictFilters, getEvidenceConflictsExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function getEvidenceConflictFilters(searchParams: URLSearchParams): EvidenceConflictFilters {
  const limitValue = searchParams.get("limit");
  const limit = limitValue ? Number(limitValue) : undefined;

  return {
    track: searchParams.get("track") ?? undefined,
    consistency_class: (searchParams.get("consistency_class") ?? undefined) as EvidenceConflictFilters["consistency_class"],
    pattern: (searchParams.get("pattern") ?? undefined) as EvidenceConflictFilters["pattern"],
    limit: Number.isFinite(limit) ? limit : undefined
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const evidenceConflicts = await getEvidenceConflictsExport(getEvidenceConflictFilters(searchParams));

  return NextResponse.json(evidenceConflicts, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
