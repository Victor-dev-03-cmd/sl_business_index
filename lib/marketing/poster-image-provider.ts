import 'server-only';
import {createHash} from 'node:crypto';

/**
 * Single private image adapter. Inference is never initiated from the browser.
 * Hugging Face free-tier credits are NOT a budget gate; the SLBI database cap,
 * paid-credit action and user confirmation must all be verified before calling.
 */
export type PosterImageProvider='openai'|'huggingface';
export type ImageProviderConfig={provider:PosterImageProvider;model:string;token:string};

const OPENAI_MODELS=[
  'gpt-image-2.5-flare','gpt-image-2.5-sunburst',
  'gpt-image-2.6-flare','gpt-image-2.6-sunburst',
] as const;
// FLUX.1-schnell is Apache-2.0; never silently substitute noncommercial dev models.
// All fal provider paths and model identifiers are server-side allowlisted.
const HF_MODELS={
  'black-forest-labs/FLUX.1-schnell':'fal-ai/flux/schnell',
} as const;
const HF_ROUTER='https://router.huggingface.co/fal-ai/';
const MAX_SOURCE_BYTES=15_000_000;
export function getPosterImageProvider():ImageProviderConfig|null {
  const provider=process.env.SLBI_POSTER_IMAGE_PROVIDER||'openai';
  if(provider==='huggingface'){
    const token=process.env.HF_TOKEN;
    const model=process.env.SLBI_POSTER_HF_MODEL||'black-forest-labs/FLUX.1-schnell';
    if(!token||!token.startsWith('hf_')||!(model in HF_MODELS))return null;
    return {provider,model,token};
  }
  if(provider==='openai'){
    const token=process.env.OPENAI_API_KEY;
    const chosen=process.env.SLBI_POSTER_IMAGE_MODEL;
    if(!token)return null;
    const model=OPENAI_MODELS.find(m=>m===chosen)||'gpt-image-2.5-flare';
    return {provider,model,token};
  }
  return null;
}

const providerDimensions=(size:string)=>{
  if(size==='1024x1024')return 'square_hd';
  if(size==='1024x1280')return 'portrait_4_3';
  if(size==='1008x1792')return 'portrait_16_9';
  if(size==='1216x640')return 'landscape_16_9';
  throw Error('Unapproved poster aspect ratio');
};
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
function assertEncodedPng(encoded:unknown):Buffer {
  if(typeof encoded!=='string'||!encoded.length||encoded.length>24_000_000)
    throw Error('Invalid image payload');
  const binary=Buffer.from(encoded,'base64');
  if(binary.length<64||binary.length>MAX_SOURCE_BYTES||
     !binary.subarray(0,8).equals(pngSignature))throw Error('Image provider returned an unsupported format');
  return binary;
}
const imageBytes=async(response:Response):Promise<Buffer>=>{
  if(!response.ok)throw Error('Image asset retrieval failed');
  const contentType=response.headers.get('content-type')?.toLowerCase()||'';
  if(!/^image\/(png|jpeg|webp)(?:;|$)/.test(contentType))
    throw Error('Image provider returned non-image bytes');
  const advertised=Number(response.headers.get('content-length')||0);
  if(advertised>MAX_SOURCE_BYTES)throw Error('Image size exceeds provider limit');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<64||bytes.length>MAX_SOURCE_BYTES)throw Error('Image provider asset exceeds limit');
  return bytes;
};
const fromOpenAI=async(config:ImageProviderConfig,prompt:string,size:string,userId:string)=>{
  const response=await fetch('https://api.openai.com/v1/images/generations',{
    method:'POST',signal:AbortSignal.timeout(90_000),cache:'no-store',
    headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:config.model,prompt,quality:'high',size,n:1,output_format:'png',
      background:'opaque',moderation:'auto',
      safety_identifier:createHash('sha256').update(userId).digest('hex').slice(0,32),
    }),
  });
  if(!response.ok)throw Error('Image provider request failed: '+response.status);
  const payload=await response.json() as {data?:Array<{b64_json?:string}>};
  return assertEncodedPng(payload.data?.[0]?.b64_json);
};
// Hugging Face routes the fal queue on the model's provider mapping URL. Never
// follow arbitrary URLs from untrusted JSON; derive queue links from an allowlist.
async function fromHuggingFace(config:ImageProviderConfig,prompt:string,size:string):Promise<Buffer>{
  const providerPath=HF_MODELS[config.model as keyof typeof HF_MODELS];
  if(!providerPath)throw Error('Unapproved Hugging Face image model');
  const queueUrl=HF_ROUTER+providerPath+'?_subdomain=queue';
  const headers={Authorization:'Bearer '+config.token,'Content-Type':'application/json'};
  const signal=AbortSignal.timeout(110_000);
  const generation=await fetch(queueUrl,{
    method:'POST',headers,cache:'no-store',redirect:'error',signal,
    body:JSON.stringify({
      prompt,image_size:providerDimensions(size),num_images:1,
      num_inference_steps:4,enable_safety_checker:true,output_format:'png',
    }),
  });
  if(!generation.ok)throw Error('Hugging Face image inference was rejected: '+generation.status);
  const submission=await generation.json() as {
    request_id?:string;status?:string;response_url?:string;
  };
  const id=submission.request_id||'';
  if(!/^[a-zA-Z0-9_-]{10,100}$/.test(id))throw Error('Invalid image queue identifier');
  // Use a fixed route; do not fetch submission.response_url or other model-provided URLs.
  const queueBase=HF_ROUTER+providerPath+'/requests/'+id;
  const wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
  let status=submission.status;
  let complete=false;
  for(let i=0;i<75;i++){
    if(status==='COMPLETED'){complete=true;break;}
    if(status==='FAILED'||status==='CANCELLED')throw Error('Image model did not complete the request');
    await wait(1000);
    const check=await fetch(queueBase+'/status?_subdomain=queue',{
      headers,signal,cache:'no-store',redirect:'error',
    });
    if(!check.ok)throw Error('Unable to query image generation status');
    const json=await check.json() as {status?:string};
    status=json.status;
  }
  if(!complete)throw Error('Hugging Face generation timed out');
  const result=await fetch(queueBase+'?_subdomain=queue',{
    headers,cache:'no-store',signal,redirect:'error',
  });
  if(!result.ok)throw Error('Unable to retrieve generated artwork');
  const payload=await result.json() as {images?:Array<{url?:string}>};
  const url=payload.images?.[0]?.url||'';
  let parsed:URL;
  try{parsed=new URL(url)}catch{throw Error('Untrusted generated asset URL');}
  // Fal image URLs are served from fal.media. The hostname restriction and
  // redirect:'error' prevent SSRF through an attacker-controlled provider response.
  const host=parsed.hostname.toLowerCase();
  if(parsed.protocol!=='https:'||!(host==='fal.media'||host.endsWith('.fal.media'))||
    parsed.username||parsed.password||parsed.port)
    throw Error('Untrusted generated asset host');
  const image=await fetch(parsed.toString(),{cache:'no-store',signal,redirect:'error'});
  return imageBytes(image);
}
export async function generatePosterProviderImage(args:{
  config:ImageProviderConfig;prompt:string;size:string;userId:string;
}):Promise<Buffer>{
  if(!args.prompt||args.prompt.length>18_000)throw Error('Invalid image prompt length');
  if(args.config.provider==='huggingface')
    return fromHuggingFace(args.config,args.prompt,args.size);
  return fromOpenAI(args.config,args.prompt,args.size,args.userId);
}
