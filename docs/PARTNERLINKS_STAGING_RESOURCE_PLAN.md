# PartnerLinks staging resource plan

This plan contains the complete set of remote resources proposed for the existing Cloudflare account. It does not authorize their creation.

## Target account

- Account ID: `44cc721515baade8fe3514e0e5a1f33b`
- Existing production configuration: `wrangler.jsonc` (must remain unchanged)

## Proposed new D1 databases

| Binding | Exact database name | Purpose |
|---|---|---|
| `COMMERCE_DB` | `partnerlinks-staging-commerce-v1` | Existing commerce baseline plus verified classification memberships |
| `SEARCH_DB` | `partnerlinks-staging-search-v1` | Existing global commerce and canonical classification search |
| `CREATOR_DB` | `partnerlinks-staging-creator-identity-v1` | 540,846 creator identities, profiles, indexed search, and page anchors |
| `CREATOR_EVIDENCE_DB` | `partnerlinks-staging-creator-evidence-v1` | Canonical and quarantined ambiguous creator/video evidence |

Cloudflare assigns each UUID during creation. No import may start until all four returned UUIDs are copied into the ignored `wrangler.staging.jsonc`, verified using a fresh read-only D1 listing, and accepted by `npm run staging:preflight -- wrangler.staging.jsonc`.

## Proposed Worker

- Exact name: `partnerlinks-release-candidate-staging`
- Exposure: generated `workers.dev` URL only
- Custom routes/domains: none
- D1 bindings: exactly the four staging databases above
- Production database bindings: none
- Production DNS changes: none

The Worker is not created or deployed during database creation. Deployment occurs only after all imports and count/integrity reconciliation pass.

## Protected existing databases

Preflight explicitly rejects these known existing names and IDs:

| Protected name | Protected ID |
|---|---|
| `creator-agent-db` | `71427d3a-ec4f-4ec1-b73c-23b8b0ebf57e` |
| `ugcweb-commerce` | `37fabe92-0dd8-43fd-a839-cde33679316b` |
| `ugcweb-search` | `fdd85d9f-797b-4875-99c6-dcaf98b71769` |
| `tiktok-shop-screener` | `32bf0cf4-54cc-431c-b1cf-241d0a4784ec` |

## Fail-closed sequence after approval

1. Re-run read-only account and D1 discovery and compare the production protection list.
2. Create only the four exact database names above. Stop on any collision or unexpected result.
3. Record the four Cloudflare-assigned UUIDs; do not import yet.
4. Re-list D1 and verify each exact staging name/UUID pair and the exact account ID.
5. Generate ignored `wrangler.staging.jsonc` from the tracked template.
6. Run staging preflight. It requires the exact account, Worker name, four bindings/names, valid distinct UUIDs, remote mode, `workers.dev`, preview URLs, and no routes/domains. It rejects every protected production ID/name.
7. Present the verified UUIDs before starting imports.

No production database is overwritten, truncated, exported, rebound, or modified by this sequence.
