/** Browser-only client. Every cloud operation is verified on the server
 * against the current auth user and owned business. No public poster URLs. */
export type SavedPosterAsset={id:string;createdAt:string|null};
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const endpoint='/api/marketing/poster/saved';
const decode=async(response:Response)=>{
  try{return await response.json() as {error?:string;assetId?:string;assets?:SavedPosterAsset[]};}
  catch{return {error:'Private poster service returned an unreadable response.'};}
};
export function privatePosterUrl(businessId:string,assetId:string){
  if(!UUID.test(businessId)||!UUID.test(assetId))throw Error('Invalid saved poster reference.');
  return endpoint+'?businessId='+encodeURIComponent(businessId)+'&assetId='+encodeURIComponent(assetId);
}
export async function listSavedPosters(businessId:string):Promise<SavedPosterAsset[]>{
  if(!UUID.test(businessId))return [];
  const res=await fetch(endpoint+'?businessId='+encodeURIComponent(businessId),{
    credentials:'same-origin',cache:'no-store',
  });
  const data=await decode(res);
  if(!res.ok)throw Error(data.error||'Private poster library is unavailable.');
  return Array.isArray(data.assets)?data.assets.filter(x=>UUID.test(x.id)):[];
}
export async function uploadSavedPoster(businessId:string,image:Blob):Promise<string>{
  if(!UUID.test(businessId)||image.type!=='image/png'||!image.size||
    image.size>12_000_000)throw Error('Choose a valid PNG poster under 12 MB.');
  const form=new FormData();form.set('businessId',businessId);
  form.set('image',image,'poster.png');
  const res=await fetch(endpoint,{method:'POST',body:form,
    credentials:'same-origin',cache:'no-store',
  });
  const data=await decode(res);
  if(!res.ok||!data.assetId||!UUID.test(data.assetId))
    throw Error(data.error||'Poster could not be saved to your private library.');
  return data.assetId;
}
export async function readSavedPoster(businessId:string,assetId:string):Promise<Blob>{
  const res=await fetch(privatePosterUrl(businessId,assetId),{
    credentials:'same-origin',cache:'no-store',
  });
  if(!res.ok){
    const data=await decode(res);
    throw Error(data.error||'Saved poster cannot be opened.');
  }
  const blob=await res.blob();
  if(blob.type!=='image/png'||!blob.size||blob.size>12_000_000)
    throw Error('The saved poster is not a valid private PNG.');
  return blob;
}
