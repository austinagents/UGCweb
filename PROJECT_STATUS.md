# AppScreener Project Status

Last synced: 2026-05-30

## Canonical Operating Context

This section is the current authoritative AppScreener architecture and strategic direction after Workflow Architecture V2 and Workflow Education V2. Preserve prior project history below, but use this section as the operating context for future decisions.

### Current Project Phase

Current Phase:

Phase 2 - Ecosystem Activation / Beta Readiness

Primary Objective:

Activate the creator/product ecosystem so users can discover, creators can participate, and products can participate.

NOT:

- roadmap expansion
- mass ingestion
- monetization flows
- Supabase migration before it is required

Priority:

1. Professional Search / Discovery
2. Creator Claiming
3. Product Claiming

Every major feature should support beta onboarding through discovery, creator participation, or product participation.

Current focus:

- professional graph-aware search
- creator profile claiming
- product profile claiming
- lightweight ownership dashboard shells
- pending-review ownership flow

### Workflow Laws (Locked)

Public Workflow:

- Ordered operating procedure
- Outcome-first
- Not a category
- Not a topic
- Not a tool collection
- Target: 3-4 tools
- Absolute max: 5 tools
- Each step should produce a concrete artifact
- Each step should have a clear handoff

Micro Workflow:

- Atomic transformation
- Target: 1-2 tools
- Absolute max: 2 tools
- Represents one repeatable operation
- Must not become a mini workflow
- Must not become a category

Examples:

Public Workflow:
SaaS In A Weekend

Micro Workflow:
Frontend Generation

Workflow Count:
30 canonical public workflows

Micro Workflow Count:
13 canonical micro workflows

### Graph Hierarchy (Locked)

Category
down to Attention Topic
down to Workflow
down to Micro Workflow
down to Tool

Example:

Category:
Marketing

Attention Topic:
Lead Generation

Workflow:
Founder Outbound Engine

Micro Workflow:
Lead Enrichment

Tool:
Clay

Important:

Attention Topics are NOT workflows.

Workflows are NOT tools.

Micro Workflows are NOT mini categories.

Tools are implementation nodes.

### Workflow Education V2 (Locked)

Purpose:

Teach operator thinking.

Do NOT merely explain tools.

Every workflow step should answer:

1. What to do
2. What you are looking for
3. What you get
4. You did this right if
5. Why it matters

Goal:

Users should learn:

- what to look for
- why the step exists
- how experts think
- how to recognize good outputs

The objective is workflow education, not tool education.

Current implementation uses:

`WorkflowEducationStep`

```ts
{
  do: string;
  look: string;
  get: string;
  check: string;
  why: string;
}
```

UI mapping:

`task` =
What to do
+
What to look for

`output` =
What you get

`connection` =
You did this right if
+
Why it matters

### Graph Philosophy (Locked)

Tools are not the product.

Relationships are the product.

The graph is the asset.

Pages are views into the graph.

Core graph:

Tool
to Workflow
to Creator
to Topic
to Evidence

Graph value comes from:

- relationship density
- relationship quality
- relationship trust
- graph traversal

Not from raw node count.

### Graph Edge Philosophy (Locked)

Edge = relationship between nodes.

Examples:

Claude to Cursor

Claude to SaaS In A Weekend

Creator to Claude

Workflow to Topic

Tool to Topic

Evidence to Tool

Important:

Node count is less valuable than edge count.

100 tools + 500 relationships can be more valuable than 3000 tools + 50 relationships.

Future features should:

1. Create edges
2. Validate edges
3. Improve traversal

Otherwise question why the feature exists.

### Product Positioning (Locked)

AppScreener is NOT:

- AI Directory
- Tool List
- Software Catalog

Closer to:

- Ecosystem Intelligence Platform
- AI Knowledge Graph
- Workflow Discovery Engine
- Creator Adoption Intelligence

Core Question:

How do the best people solve real problems with AI?

Current strongest product model:

Tool to Workflow to Creator to Topic to Evidence

### Ingestion Philosophy (Locked)

TAAFT is an ingestion source.

TAAFT is NOT:

- the product
- the taxonomy
- the intelligence layer
- the graph

AppScreener owns:

- categories
- attention topics
- workflows
- micro workflows
- creator relationships
- evidence
- graph structure

Canonical pipeline:

Raw Tool Candidate
down to Normalize
down to Classify
down to Connect
down to Promote to Canonical Tool

TAAFT is only a source feed.

The graph is the product.

### Database Philosophy (Locked)

Do NOT introduce Supabase early.

Reason:

Schema is still evolving.

Current phase uses:

Static canonical datasets

Only introduce Supabase after:

- workflow model stabilizes
- relationship model stabilizes
- graph model stabilizes

Target:

1-2 weeks of architecture stability before migration.

Lesson learned:

Do not repeat migration-heavy workflow used in previous projects.

### Creator Philosophy (Locked)

Creators are not content objects.

Creators are graph nodes.

Purpose:

Connect tools to real-world operators.

Long-term value:

Users discover tools through people.

Not categories.

Question:

What tools do the best operators actually use?

Not:

What are the top AI tools?

### Workflow Philosophy (Locked)

Workflows exist to:

1. Teach users
2. Create graph edges
3. Create tool context

Workflows are operating procedures.

Not tool collections.

Not categories.

Not lists.

Every workflow should create:

Tool to Tool

Tool to Workflow

Workflow to Topic

Workflow to Creator

relationships.

### Long-Term Product Direction

Current:

Pages

Future:

Graph
down to Pages become views into the graph

Users should be able to naturally traverse:

Tool to Workflow to Creator to Related Tool to Topic to Evidence

without needing a dedicated graph visualization.

Primary objective:

Graph Traversal

Not Graph Visualization.

The graph exists behind the scenes.

The user experiences:

Discovery
to Relationships
to Evidence
to Understanding
to Action

### Most Important Rule

We are not collecting tools.

We are collecting evidence.

Tool existence is weak evidence.

Relationships create value.

Evidence creates trust.

Graph traversal creates utility.

The graph is the moat.

## Current Platform State

AppScreener is an AI ecosystem intelligence MVP, not just a homepage MVP. It currently includes:

- homepage intelligence command center
- tool intelligence profile pages
- category and tag exploration
- workflow intelligence surfaces
- 30 canonical public workflows using Workflow Architecture V2 laws
- 13 canonical micro workflows as internal graph/intelligence objects
- Workflow Education V2 copy that teaches operator thinking on workflow detail pages
- creator taxonomy and accepted-only creator public UI
- dedicated heatmap exploration page
- watchlist, compare, moving/events/narratives/breaking-out surfaces
- private operator route
- TAAFT product ingestion artifacts
- creator ingestion/tagging foundation
- shared ecosystem color and tag systems

## Latest Completed Changes

- `/tools/[slug]` was hard-reset into a tool intelligence profile architecture.
- Tool profile pages now use:
  - local left sidebar
  - hero/tool identity card
  - Trending on AppScreener card
  - Why is this trending?
  - Creators connected to this tool
  - Popular in these workflows
  - Recent mentions
  - About metadata rail
  - Related tags
  - Tools often used with
  - Trending nearby
- Removed the local top search/action bar from `/tools/[slug]`.
- Removed the local AppScreener brand block from the `/tools/[slug]` sidebar.
- Tightened `/tools/[slug]` spacing and expanded page width usage.
- Adjusted `/tools/[slug]` sidebar vertical alignment.
- Homepage Trending timeframe toggles were removed because 7D/30D were not backed by independent ranking logic.
- Boost CTA arrows were removed; CTA buttons were subtly polished.
- Dedicated `/heatmap` page was created as a separate exploration surface from the homepage Attention Heatmap.
- Shared ecosystem tag directory was created through `lib/ecosystem-tags.ts`.
- V1 Trusted Adoption Graph was added as the first public relationship layer.
- Explicit accepted relationship arrays now power creator-tool, workflow-tool, and derived creator-workflow relationships.
- Existing creator `toolSlugs` and `workflowSlugs` are now derived from accepted graph relationships instead of imported placeholder arrays.
- V1 graph semantics now separate adoption relationships from mentions: creator `toolSlugs` and creator-workflow derivation use accepted `uses`/`teaches` relationships, while `mentions` remain a separate graph layer.
- Creator and workflow profile stale pending states were cleaned up to reflect accepted graph relationships when they exist.
- V1 Trusted Adoption Graph is now locked as the current relationship model: `uses`, `teaches`, and `mentions` are supported creator-tool relationship types; `recommends`, `builds_with`, `switched_to`, and `abandoned` remain typed for future use but are not surfaced publicly yet.
- `/tools/[slug]` creator sections now use trust-safe "Creators connected to..." language, show only accepted `uses`/`teaches` badges, and exclude mention-only relationships from adoption-style creator cards.
- Tool workflow cards no longer display seeded `creatorUsage` as public creator adoption; they only show verified creator relationship counts derived from accepted creator-workflow edges.
- Creator profile pages now separate accepted creator-tool relationships into "Verified Tool Relationships" for `uses`/`teaches` and "Tools Mentioned" for `mentions`, with mention rows treated as attention signals rather than verified usage.
- Workflow Architecture V2 replaced stack-style workflow collections with 30 canonical public workflows that behave as ordered operating procedures.
- Workflow Education V2 added `WorkflowEducationStep` copy for every public workflow step: `do`, `look`, `get`, `check`, and `why`.
- Workflow detail pages now map Workflow Education V2 into the existing tab UI without changing route structure or adding new workflow pages.
- The canonical tool universe was expanded so workflow steps reference first-class tool records instead of workflow-only labels or weak substitutes.
- Phase 2 Beta Gate systems were added:
  - `/search` professional graph-aware discovery route
  - shared `lib/search.ts` search indexing/ranking helper
  - command palette search now reuses shared graph search logic
  - creator claim CTAs and `/claim/creator/[id]`
  - product claim CTAs and `/claim/product/[slug]`
  - lightweight `/dashboard`, `/dashboard/creator`, and `/dashboard/product` shells
  - static `/operator/claims` pending claim review placeholder

## Current Active Architecture

### Frontend

- Next.js App Router
- Global styling in `app/globals.css`
- Reusable components under `components/`
- Local MVP data in `lib/data.ts`
- Static generation for tool/category/creator/tag/workflow pages

### Data

- Local seeded data drives the MVP.
- TAAFT import artifacts expand the tool universe.
- Supabase schema exists but Supabase is not required for local runtime.
- Creator import architecture exists, but pending-review creators stay hidden publicly.
- V1 Trusted Adoption Graph relationships are modeled explicitly in `lib/data.ts` using typed edges from `lib/types.ts`.
- Only accepted relationships power public creator/tool/workflow relationship surfaces.
- Mentions are accepted relationship signals but do not become verified usage or workflow adoption.
- Creator profiles surface accepted mention relationships separately as "Tools Mentioned" while keeping verified usage/teaching relationships distinct.
- Public workflows are canonical records in `workflowSeeds`, capped at 2-5 tools, with 3-4 tools preferred.
- Micro workflows remain internal graph/intelligence objects and are capped at 1-2 tools.
- Workflow Education V2 step copy currently lives in the workflow detail implementation and is mapped into the existing `task`, `output`, and `connection` presentation fields.

### Tag/Category Logic

- Broad categories remain top-level category concepts.
- Creator specialization tags and heatmap attention tags resolve through the shared ecosystem tag directory.
- Canonical tag route: `/tags/[tag]`.
- Homepage Attention Heatmap uses locked visual cluster colors and should not inherit destination tag colors.

## Runtime Behavior

Local dev:

```bash
npm start
```

Build:

```bash
npm run build
```

Typecheck:

```bash
npm run typecheck
```

The app builds without Supabase env vars by using local seeded data.

## Active Routes / Pages

- `/`
- `/tools/[slug]`
- `/tags/[tag]`
- `/categories/[slug]`
- `/workflows`
- `/workflows/[slug]`
- `/creators`
- `/creators/[id]`
- `/creators/tags/[tag]`
- `/heatmap`
- `/breaking-out`
- `/moving`
- `/events`
- `/narratives`
- `/compare`
- `/watchlist`
- `/operator`
- `/search`
- `/claim/creator/[id]`
- `/claim/product/[slug]`
- `/dashboard`
- `/dashboard/creator`
- `/dashboard/product`
- `/operator/claims`

API preview routes:

- `/api/trending-tools`
- `/api/breakout-tools`
- `/api/workflows`
- `/api/creator-adoption`
- `/api/heatmaps`

## Current Ecosystem / Tag / Workflow Logic

- `lib/ecosystem-tags.ts` unifies creator and attention tags.
- `lib/attention-subcategories.ts` contains canonical attention subcategory tags:
  - Trading Bots
  - Prediction Markets
  - Market Analysis
  - Whale Tracking
  - Mass Email
  - Lead Generation
  - Cold Outreach
  - Web Scraping
  - Daily Buzz
  - Thumbnails
  - Websites
  - Vibe Coding
  - Debugging
  - 3D Assets
  - Research Agents
  - AI Employees
  - Video Editing
  - Automation
- `lib/creator-tags.ts` contains approved creator taxonomy.
- `lib/ecosystem-colors.ts` is the shared color foundation for ecosystem categories.
- Workflow relationships currently come from local workflow/tool/creator data in `lib/data.ts`.
- Workflow-tool relationships are explicit accepted graph edges derived from existing workflow stacks.
- Creator-tool relationships begin with a small manually reviewed accepted seed set.
- Creator-workflow relationships are conservatively derived from accepted creator-tool overlap with workflow stacks.
- V1 creator-tool relationship types are locked to `uses`, `teaches`, and `mentions`; future-safe typed states exist for `recommends`, `builds_with`, `switched_to`, and `abandoned`, but they are not public UI signals yet.
- Current accepted graph counts: 26 creator-tool relationships, 20 adoption-style creator-tool edges, 46 workflow-tool relationships, and 9 derived creator-workflow relationships.

## Known Issues

- The Codex desktop UI sometimes displays `{"detail":"Bad Request"}` after tool calls. This has been a tool transport/UI issue, not necessarily an app failure. Verify with typecheck/build and file diffs.
- Some `/tools/[slug]` pages have sparse creator/workflow/mention data. Empty states are intentional and trust-safe.
- V1 creator-tool coverage is intentionally small and high-confidence; many tools still have no accepted public creator relationships.
- Mention-only relationships are intentionally excluded from verified adoption sections.
- Creator profiles may show mentioned tools even when verified usage is pending.
- `npm run build` may show autoprefixer warnings about `start` support in CSS. Builds have still completed successfully.
- Current ranking data is local/static seed logic. It is not true independent live timeframe aggregation.
- `/tools/[slug]` left sidebar alignment was adjusted via route-specific CSS and may need a final visual check in browser.

## Pending UX Cleanup Items

- Final visual QA for `/tools/[slug]` across multiple tool slugs.
- Continue refining `/tools/[slug]` only if screenshots show spacing issues.
- Confirm sidebar top alignment against hero/trending card top edge after latest offset.
- Review mobile behavior for `/tools/[slug]`.
- Review dedicated `/heatmap` page for density and interaction readiness.
- Expand accepted creator-tool and creator-workflow relationship coverage before surfacing stronger social proof.

## Next Recommended Priorities

1. QA Phase 2 beta paths end to end across search, creator claiming, and product claiming.
2. Decide whether static/mock claim submission is enough for first beta or whether a minimal durable form sink is required.
3. Improve professional search ranking only where real beta discovery queries expose gaps.
4. Keep submitted creator/product relationship suggestions pending-review only.
5. Avoid monetization, evidence scoring UI, dashboards beyond claiming/profile management, and Supabase migration until required.

## Current Deployment / Runtime Workflow

Safe local validation:

```bash
npm run typecheck
npm run build
```

Safe deploy flow:

```bash
git status
git add .
git commit -m "Describe change"
git push
```

Vercel is connected through GitHub. Avoid force-pushing unless the remote history is confirmed disposable.

## Recent Structural Decisions

- Homepage Attention Heatmap / Daily Buzz section is locked.
- Homepage master module grid is locked unless explicitly unlocked by the user.
- `/heatmap` page is a separate exploration engine, not an enlarged homepage widget.
- `/tools/[slug]` is the canonical AppScreener tool intelligence profile route.
- `/tags/[tag]` is the canonical shared ecosystem tag route.
- Public UI must not expose raw backend provenance labels.
- Use trust-safe empty states instead of fake creator usage, fake mentions, or fake workflow claims.
- Relationship arrays are the source of truth for public graph density; imported slug arrays are treated as inputs/placeholders, not public proof.
- Uses/teaches relationships can support verified adoption surfaces; mentions must remain separate from usage claims.
