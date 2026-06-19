import { NextResponse } from "next/server";

import schema from "../../../../schemas/evidence-map-export.schema.json";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(schema, {
    headers: {
      "Cache-Control": "public, max-age=3600"
    }
  });
}
