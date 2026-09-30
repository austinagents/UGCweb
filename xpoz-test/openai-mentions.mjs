import dotenv from "dotenv";
import { XpozClient } from "@xpoz/xpoz";

dotenv.config();

const client = new XpozClient({
  apiKey: process.env.XPOZ_API_KEY,
});

const query = "DeepSeek";

const endDate = new Date();
const startDate = new Date();
startDate.setDate(endDate.getDate() - 30);

const start = startDate.toISOString().slice(0, 10);
const end = endDate.toISOString().slice(0, 10);

console.log("Query:", query);
console.log("Date range:", start, "to", end);

await client.connect();

const result = await client.twitter.countPosts(query, {
  startDate: start,
  endDate: end,
});

console.log("Total mentions result:");
console.log(result);

await client.disconnect?.();
