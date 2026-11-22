import { suppressedCreator } from "@/lib/server/creator-visibility";
import { getCreatorAvatarArchive, getCreatorDatabase } from "@/lib/server/cloudflare-d1";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const graphCreatorId = decodeURIComponent(params.id);
  if (!/^creator:\d+$/.test(graphCreatorId)) return new Response("Invalid creator ID", { status: 400 });

  if (graphCreatorId === suppressedCreator.graphId) return new Response("Avatar not found", { status: 404 });

  const row = await getCreatorDatabase().prepare(
    `SELECT COALESCE(a.avatar_object_key, m.avatar_object_key) avatar_object_key
       FROM creator_account_members member
       JOIN creator_accounts a USING(account_id)
       LEFT JOIN creator_master m ON m.graph_creator_id=member.graph_creator_id
      WHERE member.graph_creator_id=?
        AND COALESCE(a.avatar_object_key, m.avatar_object_key) IS NOT NULL
      LIMIT 1`,
  ).bind(graphCreatorId).first<{ avatar_object_key: string }>();
  if (!row?.avatar_object_key?.startsWith("creator-avatars/blobs/")) return new Response("Avatar not found", { status: 404 });

  const object = await getCreatorAvatarArchive().get(row.avatar_object_key);
  if (!object) return new Response("Avatar not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
