import {countryPins} from './world'

// Approximate representative province positions, never device coordinates.
// Same coordinate system as the existing Sri Lanka SVG coastline.
const provinces: Record<string,{name:string;x:number;y:number}>={
  '1':{name:'Western Province',x:257,y:378},
  '2':{name:'Central Province',x:323,y:338},
  '3':{name:'Southern Province',x:333,y:449},
  '4':{name:'Northern Province',x:305,y:132},
  '5':{name:'Eastern Province',x:397,y:269},
  '6':{name:'North Western Province',x:274,y:284},
  '7':{name:'North Central Province',x:333,y:226},
  '8':{name:'Uva Province',x:386,y:369},
  '9':{name:'Sabaragamuwa Province',x:300,y:399},
}
export type CoarseLocation={country:string;province?:string}
export type ActivityBucket={name:string;count:number;x?:number;y?:number}
export type LiveActivity={count:number|null;mapped:number;countries:ActivityBucket[];regions:ActivityBucket[]}
export const emptyActivity:LiveActivity={count:null,mapped:0,countries:[],regions:[]}
export const analyticsConsentKey='slbi-ga4-consent-v2'
export const analyticsConsentEvent='slbi-ga4-consent-change'
export function coarseLocation(country:unknown,region:unknown):CoarseLocation|null {
  if(typeof country!=='string'||!/^[A-Z]{2}$/.test(country)||['XX','ZZ','T1','A1','A2'].includes(country))return null
  const code=typeof region==='string' ? region.toUpperCase().replace(/^LK-/,'') : ''
  return country==='LK' && /^[1-9]$/.test(code) ? {country,province:code} : {country}
}
export function summarizePresence(records:Record<string,unknown[]>):LiveActivity{
  const countries=new Map<string,ActivityBucket>(),regions=new Map<string,ActivityBucket>()
  let count=0,mapped=0
  const names=new Intl.DisplayNames(['en'],{type:'region'})
  const bump=(map:Map<string,ActivityBucket>,key:string,b:Omit<ActivityBucket,'count'>)=>{
    const old=map.get(key);map.set(key,{...b,count:(old?.count||0)+1})
  }
  for(const entries of Object.values(records)){
    const current=entries[entries.length-1]
    if(!current||typeof current!=='object'||!('active' in current)||current.active!==true)continue
    count++
    const v=current as Record<string,unknown>
    const loc=coarseLocation(v.country,v.province)
    if(!loc)continue
    mapped++
    const point=Object.prototype.hasOwnProperty.call(countryPins,loc.country)?countryPins[loc.country]:undefined
    bump(countries,loc.country,{name:names.of(loc.country)||loc.country,...(point?{x:point[0],y:point[1]}:{})})
    if(loc.country==='LK'){
      const region=loc.province?provinces[loc.province]:undefined
      // Unknown province: display a country-level representative marker,
      // explicitly labelled, rather than invent a more precise location.
      bump(regions,loc.province||'LK',{name:region?.name||'Sri Lanka · area unavailable',x:region?.x??333,y:region?.y??281})
    }
  }
  const sorted=(m:Map<string,ActivityBucket>)=>[...m.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name))
  return {count,mapped,countries:sorted(countries),regions:sorted(regions)}
}
