import { getCreatorMasterPage } from "@/lib/server/creator-master-read";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  try {
    const p=new URL(request.url).searchParams;
    return Response.json(await getCreatorMasterPage(Number(p.get("page"))||1,p.get("q")??"",Number(p.get("pageSize"))||50));
  } catch (error) {
    console.error("Creator master request failed",error);
    return Response.json({error:"Creator discovery is temporarily unavailable."},{status:500});
  }
}
