# AppScreener Proof Ingestion

## Canonical Rule

Historical validated ingestion processes are preferred over newly invented ingestion architectures.

Before replacing an ingestion workflow:

1. Attempt recovery of the historical workflow.
2. Verify existing ingestion scripts.
3. Verify existing source datasets.
4. Only design new ingestion logic if the historical workflow cannot be recovered.

## X Proof

Status:

* Active primary proof layer
* Current coverage maintained separately
* Do not modify during YouTube/GitHub/Article recovery work

## YouTube Recovery (June 2026)

Incorrect path:

* `rebuild-proof-sources-v1.mjs`
* `source-ingestion-v1-sample.json` restore

Result:

* Significantly reduced coverage
* Not representative of the working ingestion process

Correct path:

* `scripts/ingest-youtube-missing-current.mjs`

Method:

* Process missing current-catalog tools only
* Preserve existing valid proof
* Fill missing evidence
* Write into `data/tool-evidence-sources.json`
* Use one YouTube Data API `search.list` request per missing tool
* Pace requests with `YOUTUBE_DELAY_MS` to avoid hammering the API

Command used:

```bash
YOUTUBE_API_KEY="<runtime key>" YOUTUBE_DELAY_MS=2500 node scripts/ingest-youtube-missing-current.mjs
```

Results:

* Processed missing tools: 84
* Records added: 240
* Errors: 0
* Coverage: 127/127
* Duplicates: 0
* Orphans: 0
* Empty shells: 0

Generated files:

* `data/youtube-ingest-missing-current-v1.csv`
* `data/youtube-ingest-missing-current-errors-v1.csv`

## GitHub Recovery

Current known working state:

* Coverage: 100/127

Exact script used:

* `scripts/ingest-github-articles-current.mjs`

Exact command used:

```bash
node scripts/ingest-github-articles-current.mjs
```

Exact source used:

* GitHub REST API repository search
* Query shape from the historical working ingestion path:
  * `${tool.name} in:name,description,readme`
* Sorted by stars
* Maximum 3 GitHub proof sources per tool
* Writes into `data/tool-evidence-sources.json`

Output files:

* `data/github-article-ingest-127-v1.csv`
* `data/github-article-ingest-127-errors-v1.csv`

Integrity:

* Duplicates: 0
* Orphans: 0
* Empty shells: 0

## Article Recovery

Current known working state:

* Coverage: 117/127

Exact script used:

* `scripts/ingest-articles-searxng-current.mjs`

Exact command used:

```bash
SEARXNG_BASE_URL=http://127.0.0.1:8080 node scripts/ingest-articles-searxng-current.mjs
```

Exact source used:

* Docker-hosted local SearXNG
* Working engine path:
  * `engines=bing news`
* Query shapes:
  * `"${tool.name}"`
  * `"${tool.name}" AI`
  * `"${tool.name}" review`
  * `"${tool.name}" launch`
* Maximum 3 article proof sources per tool
* Writes into `data/tool-evidence-sources.json`

Output files:

* `data/article-searxng-ingest-127-v1.csv`
* `data/article-searxng-ingest-127-rejections-v1.csv`

Integrity:

* Duplicates: 0
* Orphans: 0
* Empty shells: 0

## Anti-Patterns

Do NOT:

* Restore from `source-ingestion-v1-sample.json`
* Treat sample datasets as canonical
* Replace validated ingestion workflows with rebuilds
* Create empty proof shells
* Create orphan proof records
* Create duplicate proof records

## Current Proof State

Coverage:

* YouTube: 127/127
* GitHub: 100/127
* Articles: 117/127

Integrity:

* Duplicates: 0
* Orphans: 0
* Empty shells: 0

## Future Rule

When proof coverage drops:

1. Check whether the historical ingestion workflow is being used.
2. Check existing ingestion scripts.
3. Check missing-current ingestion paths.
4. Do NOT immediately redesign ingestion.
5. Do NOT immediately rebuild from historical sample files.
