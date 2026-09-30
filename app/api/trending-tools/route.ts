import { NextResponse } from "next/server";
import { tools } from "@/lib/data";

export function GET() {
  return NextResponse.json({ data: tools.slice(0, 100), generatedFrom: "local-momentum-model" });
}
