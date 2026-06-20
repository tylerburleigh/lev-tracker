import { NextResponse } from "next/server";

import { type ClaimConsistencyReviewPacketFilters, getClaimConsistencyReviewPacketExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function getClaimConsistencyReviewPacketFilters(searchParams: URLSearchParams): ClaimConsistencyReviewPacketFilters {
  const limitValue = searchParams.get("limit");
  const limit = limitValue ? Number(limitValue) : undefined;

  return {
    q: searchParams.get("q") ?? undefined,
    track: searchParams.get("track") ?? undefined,
    issue_type: (searchParams.get("issue_type") ?? undefined) as ClaimConsistencyReviewPacketFilters["issue_type"],
    severity: (searchParams.get("severity") ?? undefined) as ClaimConsistencyReviewPacketFilters["severity"],
    source_kind: (searchParams.get("source_kind") ?? undefined) as ClaimConsistencyReviewPacketFilters["source_kind"],
    review_status: (searchParams.get("review_status") ?? undefined) as ClaimConsistencyReviewPacketFilters["review_status"],
    lifecycle_state: (searchParams.get("lifecycle_state") ?? undefined) as ClaimConsistencyReviewPacketFilters["lifecycle_state"],
    review_freshness: (searchParams.get("review_freshness") ?? undefined) as ClaimConsistencyReviewPacketFilters["review_freshness"],
    limit: Number.isFinite(limit) ? limit : undefined
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const reviewPacket = await getClaimConsistencyReviewPacketExport(getClaimConsistencyReviewPacketFilters(searchParams));

  return NextResponse.json(reviewPacket, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
