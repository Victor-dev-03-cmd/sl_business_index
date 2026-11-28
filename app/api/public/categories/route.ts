import {getPublicCategories} from '@/lib/discovery/public-cache';
export const dynamic='force-dynamic';
export async function GET(){
 try{return Response.json(await getPublicCategories(),{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Categories unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
