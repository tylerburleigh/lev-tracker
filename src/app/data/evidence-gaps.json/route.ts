import { NextResponse } from "next/server";

import { type EvidenceGapFilters, getEvidenceGapsExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function getEvidenceGapFilters(searchParams: URLSearchParams): EvidenceGapFilters {
  const limitValue = searchParams.get("limit");
  const limit = limitValue ? Number(limitValue) : undefined;

  return {
    q: searchParams.get("q") ?? undefined,
    hallmark: searchParams.get("hallmark") ?? undefined,
    track: searchParams.get("track") ?? undefined,
    stage: (searchParams.get("stage") ?? undefined) as EvidenceGapFilters["stage"],
    coverage_confidence: (searchParams.get("coverage_confidence") ?? undefined) as EvidenceGapFilters["coverage_confidence"],
    research_density: (searchParams.get("research_density") ?? undefined) as EvidenceGapFilters["research_density"],
    severity: (searchParams.get("severity") ?? undefined) as EvidenceGapFilters["severity"],
    sort: (searchParams.get("sort") ?? undefined) as EvidenceGapFilters["sort"],
    limit: Number.isFinite(limit) ? limit : undefined
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const evidenceGaps = await getEvidenceGapsExport(getEvidenceGapFilters(searchParams));

  return NextResponse.json(evidenceGaps, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
