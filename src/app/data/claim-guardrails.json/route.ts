import { NextResponse } from "next/server";

import { type ClaimGuardrailFilters, getClaimGuardrailsExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function getClaimGuardrailFilters(searchParams: URLSearchParams): ClaimGuardrailFilters {
  const limitValue = searchParams.get("limit");
  const limit = limitValue ? Number(limitValue) : undefined;

  return {
    q: searchParams.get("q") ?? undefined,
    track: searchParams.get("track") ?? undefined,
    boundary_class: (searchParams.get("boundary_class") ?? undefined) as ClaimGuardrailFilters["boundary_class"],
    overclaim_risk: (searchParams.get("overclaim_risk") ?? undefined) as ClaimGuardrailFilters["overclaim_risk"],
    limit: Number.isFinite(limit) ? limit : undefined
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const claimGuardrails = await getClaimGuardrailsExport(getClaimGuardrailFilters(searchParams));

  return NextResponse.json(claimGuardrails, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
