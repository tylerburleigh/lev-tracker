import { NextResponse } from "next/server";

import { type ClaimConsistencyAuditFilters, getClaimConsistencyAuditExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function getClaimConsistencyAuditFilters(searchParams: URLSearchParams): ClaimConsistencyAuditFilters {
  const limitValue = searchParams.get("limit");
  const limit = limitValue ? Number(limitValue) : undefined;

  return {
    q: searchParams.get("q") ?? undefined,
    track: searchParams.get("track") ?? undefined,
    issue_type: (searchParams.get("issue_type") ?? undefined) as ClaimConsistencyAuditFilters["issue_type"],
    severity: (searchParams.get("severity") ?? undefined) as ClaimConsistencyAuditFilters["severity"],
    source_kind: (searchParams.get("source_kind") ?? undefined) as ClaimConsistencyAuditFilters["source_kind"],
    review_status: (searchParams.get("review_status") ?? undefined) as ClaimConsistencyAuditFilters["review_status"],
    lifecycle_state: (searchParams.get("lifecycle_state") ?? undefined) as ClaimConsistencyAuditFilters["lifecycle_state"],
    limit: Number.isFinite(limit) ? limit : undefined
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const claimAudit = await getClaimConsistencyAuditExport(getClaimConsistencyAuditFilters(searchParams));

  return NextResponse.json(claimAudit, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
