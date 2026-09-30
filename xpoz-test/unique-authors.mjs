import dotenv from "dotenv";
import { XpozClient } from "@xpoz/xpoz";

dotenv.config();

const client = new XpozClient({
  apiKey: process.env.XPOZ_API_KEY,
});

await client.connect();

const results = await client.twitter.searchPosts(
  "@OpenAI -from:OpenAI",
  {
    startDate: "2026-05-30",
    endDate: "2026-06-06",
    limit: 5,
  }
);

console.log(JSON.stringify(results, null, 2));
