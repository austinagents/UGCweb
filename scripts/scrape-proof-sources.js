const fs = require("fs");
const { chromium } = require("playwright");

const TOOLS_FILE = "appscreener_tools_input.csv";
const OUT_FILE = "data/proof-sources/proof_sources_raw.csv";
const LIMIT_PER_PLATFORM = 30;

function parseCsvLine(line) {
  return line.match(/("([^"]|"")*"|[^,]+)/g)?.map(v =>
    v.replace(/^"|"$/g, "").replace(/""/g, '"').trim()
  ) || [];
}

function parseToolsCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]).map(s => s.toLowerCase());
  const nameIndex = header.findIndex(h => ["name", "tool", "tool_name", "title"].includes(h));
  if (nameIndex === -1) throw new Error("Could not find tool name column.");
  return lines.slice(1).map(line => parseCsvLine(line)[nameIndex]).filter(Boolean);
}

function csvEscape(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

async function scrapeSearch(page, query, platform, toolName) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  const results = await page.evaluate(() => {
    return [...document.querySelectorAll(".result")]
      .map((el) => {
        const a = el.querySelector(".result__a");
        const snippet = el.querySelector(".result__snippet");
        return {
          title: a?.innerText || "",
          url: a?.href || "",
          snippet: snippet?.innerText || ""
        };
      })
      .filter(r => r.title && r.url)
      .slice(0, 30);
  });

  return results.map((r, i) => ({
    tool_name: toolName,
    platform,
    query,
    rank: i + 1,
    title: r.title.replace(/\s+/g, " ").trim(),
    url: r.url,
    snippet: r.snippet.replace(/\s+/g, " ").trim()
  }));
}

async function main() {
  const tools = parseToolsCsv(fs.readFileSync(TOOLS_FILE, "utf8"));

  const platforms = [
    { platform: "x", query: tool => `"${tool}" site:x.com` },
    { platform: "youtube", query: tool => `"${tool}" site:youtube.com` },
    { platform: "github", query: tool => `"${tool}" site:github.com` },
    { platform: "articles", query: tool => `"${tool}" AI workflow tutorial review use case` },
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const rows = [["tool_name", "platform", "query", "rank", "title", "url", "snippet"]];

  for (const tool of tools) {
    console.log(`\n=== ${tool} ===`);

    for (const source of platforms) {
      const query = source.query(tool);
      console.log(`Scraping ${source.platform}: ${query}`);

      try {
        const results = await scrapeSearch(page, query, source.platform, tool);
        for (const r of results) {
          rows.push([r.tool_name, r.platform, r.query, r.rank, r.title, r.url, r.snippet]);
        }
        console.log(`Found ${results.length}`);
      } catch (err) {
        console.log(`ERROR ${source.platform} ${tool}: ${err.message}`);
      }

      await page.waitForTimeout(2000);
    }
  }

  await browser.close();

  fs.writeFileSync(
    OUT_FILE,
    rows.map(row => row.map(csvEscape).join(",")).join("\n")
  );

  console.log(`\nDone: ${OUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
