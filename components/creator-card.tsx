import type { CreatorProfile } from "@/lib/types";
import { creatorTagDisplayLabel, creatorTagSlug, creatorTagStyle } from "@/lib/creator-tags";
import { CreatorAvatar } from "./creator-avatar";
import { XProfileButton } from "./x-profile-button";

function publicCreatorTags(creator: CreatorProfile) {
  return [...new Set([
    creator.primarySpecialization,
    ...creator.specializationTags
  ].filter((tag): tag is NonNullable<CreatorProfile["primarySpecialization"]> => Boolean(tag)))];
}

export function CreatorCard({ creator }: { creator: CreatorProfile }) {
  return (
    <article className="creatorCard">
      <CreatorAvatar name={creator.name} src={creator.avatarUrl} />
      <span>
        <a className="creatorNameLink" href={`/creators/${creator.id}`}>{creator.name}</a>
      </span>
      <XProfileButton href={creator.xUrl} label={`${creator.name} on X`} className="creatorExternalChip creatorCardXButton" />
      <div className="creatorTagRail">
        {publicCreatorTags(creator).slice(0, 5).map((tag) => (
          <a className="creatorTagLink" href={`/tags/${creatorTagSlug(tag)}`} key={tag} style={creatorTagStyle(tag)}>{creatorTagDisplayLabel(tag)}</a>
        ))}
      </div>
    </article>
  );
}
