import { getCreatorMasterDetail } from "@/lib/server/creator-master-read";
export const dynamic="force-dynamic";
export async function GET(_:Request,{params}:{params:{id:string}}){
  try {
    const data=await getCreatorMasterDetail(decodeURIComponent(params.id));
    return data?Response.json(data):Response.json({error:"Creator not found"},{status:404});
  } catch (error) {
    console.error("Creator detail request failed",error);
    return Response.json({error:"Creator profile is temporarily unavailable."},{status:500});
  }
}
