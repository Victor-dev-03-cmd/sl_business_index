import 'server-only';
import {createClient as createAdmin} from '@supabase/supabase-js';
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function audienceService(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
 return url&&key?createAdmin(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
}
export const audienceReply=(status:number,body:Record<string,unknown>)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
