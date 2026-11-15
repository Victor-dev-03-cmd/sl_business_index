import 'server-only';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

/**
 * Provider-specific, server-only media calls. This module does not authorize
 * spending: the authenticated route must reserve a capped credit job first.
 * Hugging Face FLUX text-to-image is a SYNCHRONOUS FalAITask; image-to-image is
 * a FalAIQueueTask. Never treat a synchronous image response as a queue ID.
 */
export type PosterImageProvider='openai'|'huggingface'|'cloudflare';
export type ImageProviderConfig={provider:PosterImageProvider;model:string;token:string;accountId?:string};
const OPENAI_MODELS=[
  'gpt-image-2.5-flare','gpt-image-2.5-sunburst',
  'gpt-image-2.6-flare','gpt-image-2.6-sunburst',
] as const;
const HF_CREATE='black-forest-labs/FLUX.1-schnell';
const HF_EDIT='Qwen/Qwen-Image-Edit-2509';
const HF_ROUTER='https://router.huggingface.co/fal-ai/';
const CF_MODEL='@cf/black-forest-labs/flux-2-klein-4b';
const CF_ROOT='https://api.cloudflare.com/client/v4/accounts/';
const MAX_BYTES=15_000_000;

export function getPosterImageProvider():ImageProviderConfig|null {
  const provider=process.env.SLBI_POSTER_IMAGE_PROVIDER||'openai';
  if(provider==='cloudflare'){
    // Never accept the account or model name from a user request.
    const token=process.env.CLOUDFLARE_API_TOKEN?.trim();
    const accountId=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    if(!token||!accountId||!/^[a-f0-9]{32}$/i.test(accountId))return null;
    return {provider,model:CF_MODEL,token,accountId};
  }
  if(provider==='huggingface'){
    const token=process.env.HF_TOKEN;
    const model=process.env.SLBI_POSTER_HF_MODEL||HF_CREATE;
    if(!token||!token.startsWith('hf_')||model!==HF_CREATE)return null;
    return {provider,model,token};
  }
  if(provider==='openai'){
    const token=process.env.OPENAI_API_KEY;
    if(!token)return null;
    const name=process.env.SLBI_POSTER_IMAGE_MODEL;
    const model=OPENAI_MODELS.find(item=>item===name)||'gpt-image-2.5-flare';
    return {provider,model,token};
  }
  return null;
}
export function getPosterOperationModel(config:ImageProviderConfig,isEdit:boolean){
  return config.provider==='huggingface'&&isEdit?HF_EDIT:config.model;
}
const dimensions=(size:string)=>{
  if(size==='1024x1024')return 'square_hd';
  if(size==='1024x1280')return 'portrait_4_3';
  if(size==='1008x1792')return 'portrait_16_9';
  if(size==='1216x640')return 'landscape_16_9';
  throw Error('Unapproved poster aspect ratio');
};
const decodePng=(value:unknown)=>{
  if(typeof value!=='string'||value.length<70||value.length>24_000_000)
    throw Error('Malformed image provider output');
  const bytes=Buffer.from(value,'base64');
  if(bytes.length<64||bytes.length>MAX_BYTES||
    !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
    throw Error('Image provider returned invalid PNG data');
  return bytes;
};
const fetchFalArtwork=async(asset:unknown,signal:AbortSignal)=>{
  if(typeof asset!=='string')throw Error('No generated artwork URL');
  let u:URL;
  try{u=new URL(asset)}catch{throw Error('Untrusted generated asset URL');}
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||!(host==='fal.media'||host.endsWith('.fal.media'))||
    u.username||u.password||u.port)throw Error('Untrusted generated asset host');
  const response=await fetch(u.toString(),{cache:'no-store',signal,redirect:'error'});
  if(!response.ok)throw Error('Generated image asset retrieval failed');
  if(!/^image\/(png|jpeg|webp)(?:;|$)/i.test(response.headers.get('content-type')||''))
    throw Error('Generated asset has invalid MIME type');
  if(Number(response.headers.get('content-length')||0)>MAX_BYTES)
    throw Error('Generated image is too large');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<64||bytes.length>MAX_BYTES)
    throw Error('Generated image exceeds size limit');
  return bytes;
};

export class PosterProviderFailure extends Error{
  constructor(readonly kind:'auth'|'credits'|'model'|'rate-limit'|'service',status:number){
    super('AI image provider '+kind+' ('+status+')');this.name='PosterProviderFailure';
  }
}
const requireProviderOk=(status:number)=>{
  if(status>=200&&status<300)return;
  if(status===401||status===403)throw new PosterProviderFailure('auth',status);
  if(status===402||status===402)throw new PosterProviderFailure('credits',status);
  if(status===404||status===422)throw new PosterProviderFailure('model',status);
  if(status===429)throw new PosterProviderFailure('rate-limit',status);
  throw new PosterProviderFailure('service',status);
};
async function openAiImage(config:ImageProviderConfig,prompt:string,size:string,userId:string,source?:Buffer){
  const isEdit=Boolean(source);
  // Keep OpenAI edits in the dedicated images/edits route with a real uploaded image.
  const endpoint=isEdit?'https://api.openai.com/v1/images/edits':
    'https://api.openai.com/v1/images/generations';
  let body:BodyInit;let headers:Record<string,string>;
  if(source){
    const form=new FormData();
    form.set('image',new Blob([new Uint8Array(source)],{type:'image/png'}),'source.png');
    form.set('prompt',prompt);form.set('model',config.model);form.set('size',size);
    form.set('quality','high');form.set('n','1');form.set('output_format','png');
    body=form;headers={Authorization:'Bearer '+config.token};
  }else{
    body=JSON.stringify({model:config.model,prompt,quality:'high',size,n:1,
      output_format:'png',background:'opaque',moderation:'auto',
      safety_identifier:createHash('sha256').update(userId).digest('hex').slice(0,32)});
    headers={Authorization:'Bearer '+config.token,'Content-Type':'application/json'};
  }
  const response=await fetch(endpoint,{method:'POST',body,headers,
    signal:AbortSignal.timeout(105_000),cache:'no-store',redirect:'error'});
  requireProviderOk(response.status);
  const data=await response.json() as {data?:Array<{b64_json?:string}>};
  return decodePng(data.data?.[0]?.b64_json);
}
const wait=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));
async function hfImage(config:ImageProviderConfig,prompt:string,size:string,source?:Buffer){
  const signal=AbortSignal.timeout(105_000);
  const headers={Authorization:'Bearer '+config.token,'Content-Type':'application/json'};
  // Hugging Face's FalAITask for text-to-image is synchronous:
  // POST /fal-ai/fal-ai/flux/schnell returns {images:[{url}]}.
  if(!source){
    const response=await fetch(HF_ROUTER+'fal-ai/flux/schnell',{
      method:'POST',headers,cache:'no-store',redirect:'error',signal,
      body:JSON.stringify({prompt,image_size:dimensions(size),num_images:1,
        num_inference_steps:4,enable_safety_checker:true,output_format:'png'}),
    });
    requireProviderOk(response.status);
    const payload=await response.json() as {images?:Array<{url?:string}>};
    return fetchFalArtwork(payload.images?.[0]?.url,signal);
  }
  // HF FalAIQueueTask for Qwen Image Edit uses queue subdomain and existing,
  // privately loaded image bytes rather than a public external image URL.
  const modelPath='fal-ai/qwen-image-edit-2509';
  const queueQuery='?_subdomain=queue';
  const base=HF_ROUTER+modelPath;
  const request=await fetch(base+queueQuery,{
    method:'POST',headers,cache:'no-store',redirect:'error',signal,
    body:JSON.stringify({prompt,image_urls:['data:image/png;base64,'+source.toString('base64')],
      image_size:dimensions(size),num_images:1,enable_safety_checker:true,
      output_format:'png'}),
  });
  requireProviderOk(request.status);
  const queued=await request.json() as {request_id?:string;response_url?:string;status?:string};
  const id=queued.request_id;
  if(!id||!/^[a-zA-Z0-9_-]{12,100}$/.test(id))
    throw Error('Invalid image-edit queue identifier');
  // The provider may return an endpoint-specific result path. Trust only the
  // fixed provider-model prefix, never the supplied host or arbitrary URL.
  const expected='/'+modelPath+'/requests/'+id;
  let target=expected;
  try{
    const u=new URL(queued.response_url||'');
    if(u.pathname===expected)target=u.pathname;
  }catch{}
  let complete=queued.status==='COMPLETED';
  for(let i=0;i<75&&!complete;i++){
    await wait(1000);
    const status=await fetch(HF_ROUTER+target+'/status'+queueQuery,{
      headers,cache:'no-store',redirect:'error',signal});
    requireProviderOk(status.status);
    const data=await status.json() as {status?:string;error?:string};
    if(data.error||data.status==='FAILED'||data.status==='CANCELLED')
      throw Error('Image edit provider rejected the request');
    complete=data.status==='COMPLETED';
  }
  if(!complete)throw Error('Image edit request timed out');
  const response=await fetch(HF_ROUTER+target+queueQuery,{
    headers,cache:'no-store',redirect:'error',signal});
  requireProviderOk(response.status);
  const payload=await response.json() as {images?:Array<{url?:string}>};
  return fetchFalArtwork(payload.images?.[0]?.url,signal);
}
/**
 * Cloudflare-hosted FLUX.2 klein 4B: one commercial-friendly model for both
 * initial posters and image-to-image edits. No AI Gateway, third-party billing
 * route, or user-provided URLs. Workers AI Free has its own 10k Neuron/day cap.
 * Cloudflare's model-specific REST call requires multipart FormData, including
 * for pure text-to-image. Responses return { success, result: { image: base64 } }.
 */
const cfPosterSize=(size:string):[number,number]=>{
  const allowed:Record<string,[number,number]>={
    '1024x1024':[1024,1024],
    '1024x1280':[1024,1280],
    '1008x1792':[1008,1792],
    '1216x640':[1216,640],
  };
  const result=allowed[size];
  if(!result)throw Error('Unapproved Cloudflare poster size');
  return result;
};
const cfImage=async(config:ImageProviderConfig,prompt:string,size:string,source?:Buffer)=>{
  if(!config.accountId||!/^[a-f0-9]{32}$/i.test(config.accountId)||config.model!==CF_MODEL)
    throw Error('Cloudflare image provider configuration invalid');
  const [width,height]=cfPosterSize(size);
  const form=new FormData();
  form.set('prompt',prompt.slice(0,2048));
  form.set('width',String(width));form.set('height',String(height));
  if(source){
    // Workers AI documents that FLUX.2 input reference images must be
    // smaller than 512x512. Keep original user-owned poster in private storage.
    const small=await sharp(source,{limitInputPixels:20000000})
      .resize(480,480,{fit:'inside',withoutEnlargement:true})
      .png().toBuffer();
    form.set('input_image_0',new Blob([new Uint8Array(small)],{type:'image/png'}),'original.png');
  }
  const response=await fetch(CF_ROOT+config.accountId+'/ai/run/'+CF_MODEL,{
    method:'POST',
    headers:{Authorization:'Bearer '+config.token},
    body:form,cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(105_000),
  });
  // Free allocation exhausted should produce a clear cap error, never a
  // charged alternative provider call or silent retry.
  requireProviderOk(response.status);
  const raw=await response.text();
  if(raw.length>24_000_000)throw Error('Cloudflare response exceeds image limit');
  let payload:{success?:boolean;result?:{image?:unknown};errors?:unknown[]};
  try{payload=JSON.parse(raw) as typeof payload}
  catch{throw Error('Cloudflare image provider returned invalid JSON');}
  if(payload.success!==true||!payload.result?.image)
    throw Error('Cloudflare image provider returned no image');
  const encoded=payload.result.image;
  if(typeof encoded!=='string'||encoded.length<64||encoded.length>23_000_000)
    throw Error('Cloudflare encoded image is invalid');
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.length<64||bytes.length>MAX_BYTES)throw Error('Cloudflare generated image exceeds limit');
  // Some Cloudflare image models return JPEG, while others return PNG or WebP.
  // Sharp validates the decoded pixels; the existing generation route stores
  // the normalized, private PNG regardless of provider output encoding.
  const metadata=await sharp(bytes,{limitInputPixels:20000000}).metadata();
  if(!['jpeg','png','webp'].includes(metadata.format||''))
    throw Error('Cloudflare generated unsupported image format');
  return bytes;
};

export async function generatePosterProviderImage(args:{
  config:ImageProviderConfig;prompt:string;size:string;userId:string;sourceImage?:Buffer;
}):Promise<Buffer>{
  if(!args.prompt||args.prompt.length>18_000)throw Error('Invalid image prompt');
  if(args.config.provider==='cloudflare')
    return cfImage(args.config,args.prompt,args.size,args.sourceImage);
  if(args.config.provider==='huggingface')
    return hfImage(args.config,args.prompt,args.size,args.sourceImage);
  return openAiImage(args.config,args.prompt,args.size,args.userId,args.sourceImage);
}
