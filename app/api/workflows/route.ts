import { NextResponse } from "next/server";
import { workflows } from "@/lib/data";

export function GET() {
  return NextResponse.json({ data: workflows, generatedFrom: "local-workflow-graph" });
}
