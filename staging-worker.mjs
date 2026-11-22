import application from "./.open-next/worker.js";

const unauthorized = (status, message) =>
  new Response(message, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "www-authenticate": 'Bearer realm="PartnerLinks staging"',
    },
  });

async function equalSecret(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

export default {
  async fetch(request, env, context) {
    if (!env.STAGING_ACCESS_TOKEN) {
      return unauthorized(503, "Staging access is not configured.");
    }

    const authorization = request.headers.get("authorization") ?? "";
    const expected = `Bearer ${env.STAGING_ACCESS_TOKEN}`;
    if (!(await equalSecret(authorization, expected))) {
      return unauthorized(401, "Authentication required.");
    }

    if ((request.method === "GET" || request.method === "HEAD") && env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;
    }

    return application.fetch(request, env, context);
  },
};

