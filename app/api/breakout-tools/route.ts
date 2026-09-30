import { NextResponse } from "next/server";
import { breakingOutTools } from "@/lib/data";

export function GET() {
  return NextResponse.json({ data: breakingOutTools, generatedFrom: "local-momentum-model" });
}
