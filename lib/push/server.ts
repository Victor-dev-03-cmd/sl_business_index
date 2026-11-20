import 'server-only'
import {createClient as createServiceClient} from '@supabase/supabase-js'
export function serviceClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY
  if(!url||!secret)throw new Error('Database service not configured')
  return createServiceClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
}
