import { NextResponse } from "next/server";
import { creators } from "@/lib/data";

export function GET() {
  const publicCreators = creators.map(({
    sourceUrl,
    importedFrom,
    importedAt,
    sourceConfidence,
    verificationSignals,
    tagConfidence,
    tagSource,
    tagNotes,
    rawImportedTags,
    tagInferenceMethod,
    avatarSourceType,
    avatarSourceUrl,
    avatarVerified,
    listingStatus,
    status,
    toolSlugs,
    workflowSlugs,
    recentMentions,
    creatorScore,
    rankingPosition,
    ...creator
  }) => creator);
  return NextResponse.json({ data: { creators: publicCreators, signals: [] }, generatedFrom: "accepted-creator-graph" });
}
