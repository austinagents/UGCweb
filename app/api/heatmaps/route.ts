import { NextResponse } from "next/server";
import { attentionSubCategories } from "@/lib/data";

export function GET() {
  return NextResponse.json({ data: attentionSubCategories, generatedFrom: "local-attention-pressure-model" });
}
