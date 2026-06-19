import { NextResponse } from "next/server";

import schema from "../../../../schemas/evidence-index-export.schema.json";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(schema, {
    headers: {
      "Cache-Control": "public, max-age=3600"
    }
  });
}
