import { NextResponse } from "next/server";

import { type CoverageAuditFilters, getCoverageAuditExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function getCoverageAuditFilters(searchParams: URLSearchParams): CoverageAuditFilters {
  const limitValue = searchParams.get("limit");
  const limit = limitValue ? Number(limitValue) : undefined;

  return {
    track: searchParams.get("track") ?? undefined,
    method_class: (searchParams.get("method_class") ?? undefined) as CoverageAuditFilters["method_class"],
    limit: Number.isFinite(limit) ? limit : undefined
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const coverageAudit = await getCoverageAuditExport(getCoverageAuditFilters(searchParams));

  return NextResponse.json(coverageAudit, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
