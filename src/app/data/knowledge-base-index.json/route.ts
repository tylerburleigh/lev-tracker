import { NextResponse } from "next/server";

import { getKnowledgeBaseIndexExport } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const knowledgeBaseIndex = await getKnowledgeBaseIndexExport();

  return NextResponse.json(knowledgeBaseIndex, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
