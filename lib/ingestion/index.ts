import { fetchGithubSignals } from "./github";
import { fetchProductHuntSignals } from "./producthunt";
import { fetchRedditSignals } from "./reddit";
import { fetchRssSignals } from "./rss";
import { fetchTaaftSignals } from "./taaft";
import { fetchXSignals } from "./x";
import { fetchYoutubeSignals } from "./youtube";

export async function fetchAllIngestionSignals() {
  // MVP acceptance is intentionally gated to Product Hunt and TAAFT.
  // Other adapters stay available as future signal sources, but do not list products yet.
  const batches = await Promise.all([
    fetchProductHuntSignals(),
    fetchTaaftSignals()
  ]);

  return batches.flat();
}

export async function fetchFutureExpansionSignals() {
  const batches = await Promise.all([
    fetchGithubSignals(),
    fetchRedditSignals(),
    fetchXSignals(),
    fetchYoutubeSignals(),
    fetchRssSignals()
  ]);

  return batches.flat();
}
