# Chat Handoff

Last synced: 2026-05-30

## Canonical Operating Context

This section is the current authoritative AppScreener architecture and strategic direction after Workflow Architecture V2 and Workflow Education V2. Preserve prior handoff history below, but use this section as the operating context for future work.

### Current Project Phase

Current Phase: Phase 2 - Ecosystem Activation / Beta Readiness

Primary Objective: activate the creator/product ecosystem so users can discover, creators can participate, and products can participate.

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

- Public Workflow: SaaS In A Weekend
- Micro Workflow: Frontend Generation

Workflow Count: 30 canonical public workflows

Micro Workflow Count: 13 canonical micro workflows

### Graph Hierarchy (Locked)

Category
down to Attention Topic
down to Workflow
down to Micro Workflow
down to Tool

Example:

- Category: Marketing
- Attention Topic: Lead Generation
- Workflow: Founder Outbound Engine
- Micro Workflow: Lead Enrichment
- Tool: Clay

Important:

- Attention Topics are NOT workflows.
- Workflows are NOT tools.
- Micro Workflows are NOT mini categories.
- Tools are implementation nodes.

### Workflow Education V2 (Locked)

Purpose: teach operator thinking.

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

- `task` = What to do + What to look for
- `output` = What you get
- `connection` = You did this right if + Why it matters

### Graph Philosophy (Locked)

Tools are not the product.

Relationships are the product.

The graph is the asset.

Pages are views into the graph.

Core graph:

Tool to Workflow to Creator to Topic to Evidence

Graph value comes from:

- relationship density
- relationship quality
- relationship trust
- graph traversal

Not from raw node count.

### Graph Edge Philosophy (Locked)

Edge = relationship between nodes.

Examples:

- Claude to Cursor
- Claude to SaaS In A Weekend
- Creator to Claude
- Workflow to Topic
- Tool to Topic
- Evidence to Tool

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

Reason: schema is still evolving.

Current phase uses:

Static canonical datasets

Only introduce Supabase after:

- workflow model stabilizes
- relationship model stabilizes
- graph model stabilizes

Target: 1-2 weeks of architecture stability before migration.

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

- Tool to Tool
- Tool to Workflow
- Workflow to Topic
- Workflow to Creator relationships

### Long-Term Product Direction

Current: pages

Future: graph, with pages becoming views into the graph.

Users should be able to naturally traverse:

Tool to Workflow to Creator to Related Tool to Topic to Evidence

without needing a dedicated graph visualization.

Primary objective:

Graph Traversal

Not Graph Visualization.

The graph exists behind the scenes.

The user experiences:

Discovery to Relationships to Evidence to Understanding to Action

### Most Important Rule

We are not collecting tools.

We are collecting evidence.

Tool existence is weak evidence.

Relationships create value.

Evidence creates trust.

Graph traversal creates utility.

The graph is the moat.

## Current Working Context

The current active work is Phase 2 Ecosystem Activation / Beta Readiness. The three active beta gates are professional search/discovery, creator claiming, and product claiming.

The workflow system now includes 30 canonical public workflows and 13 canonical micro workflows. Public workflows are ordered operating procedures, not stacks or tool collections. Micro workflows are internal graph/intelligence objects, not public navigation objects.

Workflow detail pages now use Workflow Education V2 copy to teach operator thinking. Each step is modeled around what to do, what to look for, what the user gets, how to know the step worked, and why the step matters.

Phase 2 Beta Gate systems now exist:

- `/search` professional graph-aware discovery surface
- shared `lib/search.ts` search index/ranking helper
- command palette search reuses shared graph search logic
- creator claim CTA on `/creators/[id]`
- product claim CTA on `/tools/[slug]`
- `/claim/creator/[id]`
- `/claim/product/[slug]`
- `/dashboard`, `/dashboard/creator`, `/dashboard/product`
- `/operator/claims` static pending claim review placeholder

Tool profile creator sections use trust-safe "Creators connected to..." language and only surface accepted `uses`/`teaches` edges there. Mention-only relationships remain excluded from verified adoption sections.

Creator profile pages now surface accepted `mentions` separately under "Tools Mentioned" and accepted `uses`/`teaches` under "Verified Tool Relationships". Mentioned tools are attention signals, not verified usage claims.

The user is highly sensitive to accidental changes outside the requested scope. The homepage Attention Heatmap / Daily Buzz design and homepage master module grid are locked.

## Immediate Next Priorities

1. QA Phase 2 beta paths end to end across search, creator claiming, and product claiming.
2. Decide whether static/mock claim submission is enough for first beta or whether a minimal durable form sink is required.
3. Improve professional search ranking only where real beta discovery queries expose gaps.
4. Keep submitted creator/product relationship suggestions pending-review only.
5. Avoid monetization, evidence scoring UI, dashboards beyond claiming/profile management, and Supabase migration until required.

## Current Design Direction

AppScreener should feel like:

- AI ecosystem intelligence
- creator/tool/workflow discovery
- operational taxonomy and relationship mapping
- dense premium terminal UI
- Bloomberg/DexScreener/Linear/Vercel-like restraint

Avoid:

- generic SaaS landing page patterns
- Product Hunt clone behavior
- fake analytics
- bright neon/glossy UI
- oversized empty cards
- fabricated social proof

## Important Constraints

- Do not touch homepage Attention Heatmap / Daily Buzz unless explicitly asked.
- Do not touch homepage master grid/module layout unless explicitly asked.
- Do not change global nav unless explicitly asked.
- Do not fabricate creator-tool usage, mentions, quotes, endorsements, or unsupported metrics.
- Only accepted graph relationships can power public creator/tool/workflow UI.
- `mentions` are a separate relationship layer and must not be treated as verified usage or shown in adoption-style creator sections.
- On creator profile pages, accepted `mentions` should be shown as "Tools Mentioned" when present, even if verified usage is still pending.
- Public UI must not expose TAAFT/Favikon/Product Hunt provenance labels.
- Pending-review creators must remain hidden publicly.
- If a requested change would violate a locked area, stop and explain that it is restricted.
- Workflow Architecture V2 laws are locked: public workflows are ordered operating procedures with 2-5 tools, preferably 3-4; micro workflows are atomic transformations with 1-2 tools.
- Workflow Education V2 is locked: workflow steps should teach operator thinking, not merely describe tools.

## Active UI Philosophy

Use compact, high-signal modules:

- thin borders
- dark fills
- subtle low-opacity glow
- tight spacing rhythm
- dense metadata rows
- compact cards
- clickable discovery loops

Prefer making existing information more usable over adding new content.

## Current Unresolved Issues

- V1 graph coverage is intentionally small; many tools still have no accepted public creator relationships.
- Workflow detail pages now surface accepted derived creator-workflow relationships when present.
- Empty states should remain compact and professional.
- Future-safe creator-tool types exist for `recommends`, `builds_with`, `switched_to`, and `abandoned`, but V1 public surfaces currently support only `uses`, `teaches`, and separated `mentions`.
- The Codex app may show `{"detail":"Bad Request"}` after tools; verify actual work with files/typecheck/build instead of assuming app failure.

## Exact Current Focus Areas

Current system under active refinement:

- V1 Trusted Adoption Graph

Current relevant files:

- `lib/types.ts`
- `lib/data.ts`
- `lib/search.ts`
- `app/search/page.tsx`
- `app/claim/creator/[id]/page.tsx`
- `app/claim/product/[slug]/page.tsx`
- `app/dashboard/creator/page.tsx`
- `app/dashboard/product/page.tsx`
- `app/operator/claims/page.tsx`
- `PROJECT_STATUS.md`
- `README.md`
- `CHAT_HANDOFF.md`

Current relationship rules:

- relationship arrays are the source of truth
- imported creator slug arrays are placeholders/inputs, not public proof
- creator `toolSlugs` are derived from accepted `uses`/`teaches` relationships, not mentions
- creator `workflowSlugs` are derived from accepted creator-workflow relationships
- workflow `toolSlugs` are derived from accepted workflow-tool relationships
- accepted mentions remain a real graph layer but should stay separate from adoption/usage claims
- creator profile relationship sections split verified `uses`/`teaches` from mention-only tool relationships

## Known Codex Workflow Constraints

- The app has repeatedly shown `{"detail":"Bad Request"}` after tool calls. This appears to be a Codex app/tool transport display issue.
- Continue by checking actual filesystem state, typecheck, and build.
- Avoid unnecessary tool calls when the user is asking for very small changes.
- Use `apply_patch` for file edits.
- Prefer `rg` and quoted paths, especially for routes like `app/tools/[slug]/page.tsx`.

## Important Implementation Notes For Next Session

- `PROJECT_STATUS.md` and `CHAT_HANDOFF.md` are now required state sync files.
- After meaningful implementation:
  1. Update the feature/system itself.
  2. Update `PROJECT_STATUS.md`.
  3. Update `README.md` if architecture/product capabilities changed.
  4. Update `CHAT_HANDOFF.md` with latest operational context.
- Check `git status` before assuming clean state.

## Current Product Decisions To Preserve

- Homepage Attention Heatmap clusters:
  - Trading & Markets
  - Growth & Sales
  - Daily Buzz
  - Builder Tools
  - Automation & Ops
- Daily Buzz color system is locked.
- `/tools/[slug]` should remain the canonical product intelligence profile page.
- `/heatmap` should remain a separate exploration page.
- `/tags/[tag]` should be the unified ecosystem tag destination.
- Public creator pages should only show accepted creators.
