import { NextResponse } from "next/server";

import { getSourceAuditById } from "@/lib/site-data";

export const dynamic = "force-dynamic";

type SourceAuditRouteProps = {
  params: Promise<{
    sourceId: string;
  }>;
};

export async function GET(_request: Request, { params }: SourceAuditRouteProps) {
  const { sourceId } = await params;
  const sourceAudit = await getSourceAuditById(sourceId);

  if (!sourceAudit) {
    return NextResponse.json(
      {
        error: "Source not found",
        source: sourceId
      },
      { status: 404 }
    );
  }

  return NextResponse.json(sourceAudit, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
