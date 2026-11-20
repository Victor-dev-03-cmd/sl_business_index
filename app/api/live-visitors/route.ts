import {createSign} from 'node:crypto'
import {unstable_cache} from 'next/cache'
import {cityPins} from '@/lib/live/geo'
import {countryPins} from '@/lib/live/world'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const MIN_CITY_GROUP=5
type Row={dimensionValues?:{value?:string}[];metricValues?:{value?:string}[]}
type Report={rows?:Row[];metadata?:{subjectToThresholding?:boolean}}
type Bucket={name:string;count:number;x?:number;y?:number}
const count=(row:Row|undefined)=>Math.max(0,Number.parseInt(row?.metricValues?.[0]?.value||'0',10)||0)
const validName=(n:string)=>n.length>0&&n.length<=100&&!/^\(.*\)$/.test(n)
async function googleToken(email:string,key:string){
  const now=Math.floor(Date.now()/1000)
  const encode=(o:unknown)=>Buffer.from(JSON.stringify(o)).toString('base64url')
  const data=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:email,scope:'https://www.googleapis.com/auth/analytics.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3000})
  const sig=createSign('RSA-SHA256').update(data).sign(key.replace(/\\n/g,'\n')).toString('base64url')
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:data+'.'+sig}),cache:'no-store',signal:AbortSignal.timeout(8000)})
  if(!response.ok){console.warn('SLBI_GA4_TOKEN_HTTP',response.status);throw Error('token unavailable')}
  const token=(await response.json()).access_token
  if(typeof token!=='string')throw Error('invalid token')
  return token
}
async function load(){
  const property=process.env.SLBI_GA4_PROPERTY_ID||''
  const email=process.env.SLBI_GA4_SERVICE_ACCOUNT_EMAIL||''
  const key=process.env.SLBI_GA4_PRIVATE_KEY||''
  if(!/^\d+$/.test(property)||!email||!key)return {status:'not_configured' as const}
  try{
    const token=await googleToken(email,key)
    const run=async(dimensions:string[],filter?:object):Promise<Report>=>{
      const response=await fetch('https://analyticsdata.googleapis.com/v1beta/properties/'+property+':runRealtimeReport',{
        method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({dimensions:dimensions.map(name=>({name})),metrics:[{name:'activeUsers'}],minuteRanges:[{startMinutesAgo:29,endMinutesAgo:0}],limit:300,...(filter?{dimensionFilter:filter}:{})}),
        cache:'no-store',signal:AbortSignal.timeout(8000)
      })
      if(!response.ok){console.warn('SLBI_GA4_REPORT_HTTP',response.status);throw Error('report unavailable')}
      return response.json()
    }
    const [total,countries,cities]=await Promise.all([run([]),run(['country','countryId']),run(['city'],{filter:{fieldName:'countryId',stringFilter:{matchType:'EXACT',value:'LK'}}})])
    // Country totals include small groups; city-level groups below five are
    // withheld. These are coarse GA4 aggregates, not location of individuals.
    const normalize=(r:Report,local:boolean):Bucket[]=>{
      if(r.metadata?.subjectToThresholding)return []
      return (r.rows||[]).flatMap(row=>{
        const name=row.dimensionValues?.[0]?.value||''
        const n=count(row)
        if(n<(local?MIN_CITY_GROUP:1)||!validName(name))return []
        const code=row.dimensionValues?.[1]?.value||''
        const pin=local?cityPins[name]:countryPins[code]
        return [{name,count:n,...(pin?{x:pin[0],y:pin[1]}:{})}]
      }).sort((a,b)=>b.count-a.count)
    }
    return {status:'ready' as const,total:total.metadata?.subjectToThresholding?null:count(total.rows?.[0]),countries:normalize(countries,false),cities:normalize(cities,true),updatedAt:new Date().toISOString(),windowMinutes:30}
  }catch{
    return {status:'unavailable' as const}
  }
}
// Shared data cache plus CDN caching; no per-user or parameterized report.
const cached=unstable_cache(load,['slbi-public-ga4-realtime-v2'],{revalidate:60})
export async function GET(){
  const value=await cached()
  return Response.json(value,{headers:{'Cache-Control':'public, max-age=0, s-maxage=60, stale-while-revalidate=60'}})
}
