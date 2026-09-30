import { redirect } from "next/navigation";
import { creatorTagSlug, creatorSpecializations } from "@/lib/creator-tags";

export function generateStaticParams() {
  return creatorSpecializations.map((tag) => ({ tag: creatorTagSlug(tag) }));
}

export default function CreatorTagRedirect({ params }: { params: { tag: string } }) {
  redirect(`/tags/${params.tag}`);
}
