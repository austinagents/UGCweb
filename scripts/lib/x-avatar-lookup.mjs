export async function fetchAuthorAvatar(handle, { apiKey, userAgent = "AppScreener X Avatar Lookup", timeoutMs = 12000 } = {}) {
  if (!apiKey) throw new Error("TWITTERAPI_IO_API_KEY missing");
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return "";
  const url = new URL("https://api.twitterapi.io/twitter/tweet/advanced_search");
  url.searchParams.set("query", `from:${normalizedHandle}`);
  url.searchParams.set("queryType", "Latest");
  const response = await fetchWithTimeout(url, {
    timeoutMs,
    headers: {
      "X-API-Key": apiKey,
      "User-Agent": userAgent
    }
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`non_json_${response.status}:${text.slice(0, 120)}`);
  }
  if (!response.ok) throw new Error(`http_${response.status}:${JSON.stringify(json).slice(0, 160)}`);
  const tweet = (json.tweets || []).find((item) => normalizeHandle(item.author?.userName || item.user?.screen_name) === normalizedHandle) || (json.tweets || [])[0];
  return normalizeAvatarUrl(tweet?.author?.profilePicture || tweet?.author?.profileImageUrl || tweet?.user?.profile_image_url_https || tweet?.user?.profile_image_url || "");
}

export function normalizeHandle(handle) {
  return String(handle || "").replace(/^@/, "").trim().toLowerCase();
}

export function normalizeAvatarUrl(url) {
  return String(url || "").replace("_normal.", "_400x400.");
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
