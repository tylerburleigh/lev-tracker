import { NextResponse } from "next/server";

import { type EvidenceQualityFilters, getEvidenceQualityExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function getEvidenceQualityFilters(searchParams: URLSearchParams): EvidenceQualityFilters {
  const limitValue = searchParams.get("limit");
  const limit = limitValue ? Number(limitValue) : undefined;

  return {
    track: searchParams.get("track") ?? undefined,
    quality_class: (searchParams.get("quality_class") ?? undefined) as EvidenceQualityFilters["quality_class"],
    limitation: (searchParams.get("limitation") ?? undefined) as EvidenceQualityFilters["limitation"],
    human_relevance: (searchParams.get("human_relevance") ?? undefined) as EvidenceQualityFilters["human_relevance"],
    source_type: searchParams.get("source_type") ?? undefined,
    limit: Number.isFinite(limit) ? limit : undefined
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const evidenceQuality = await getEvidenceQualityExport(getEvidenceQualityFilters(searchParams));

  return NextResponse.json(evidenceQuality, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
