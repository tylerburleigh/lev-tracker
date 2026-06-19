import { NextResponse } from "next/server";

import { type EvidenceIndexFilters, getEvidenceIndexExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function getEvidenceIndexFilters(searchParams: URLSearchParams): EvidenceIndexFilters {
  const limitValue = searchParams.get("limit");
  const limit = limitValue ? Number(limitValue) : undefined;

  return {
    q: searchParams.get("q") ?? undefined,
    hallmark: searchParams.get("hallmark") ?? undefined,
    track: searchParams.get("track") ?? undefined,
    intervention: searchParams.get("intervention") ?? undefined,
    tier: searchParams.get("tier") ?? undefined,
    direction: searchParams.get("direction") ?? undefined,
    confidence: (searchParams.get("confidence") ?? undefined) as EvidenceIndexFilters["confidence"],
    endpoint: searchParams.get("endpoint") ?? undefined,
    source_type: searchParams.get("source_type") ?? undefined,
    species: (searchParams.get("species") ?? undefined) as EvidenceIndexFilters["species"],
    source_reuse: (searchParams.get("source_reuse") ?? undefined) as EvidenceIndexFilters["source_reuse"],
    coverage_confidence: (searchParams.get("coverage_confidence") ?? undefined) as EvidenceIndexFilters["coverage_confidence"],
    sort: (searchParams.get("sort") ?? undefined) as EvidenceIndexFilters["sort"],
    limit: Number.isFinite(limit) ? limit : undefined
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const evidenceIndex = await getEvidenceIndexExport(getEvidenceIndexFilters(searchParams));

  return NextResponse.json(evidenceIndex, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
