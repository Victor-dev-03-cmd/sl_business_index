import 'server-only';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

/**
 * The vendor can upload many *references*, but a real source image is passed
 * to Cloudflare only when the vendor explicitly selects "Use this actual image".
 * The request is authenticated by the route; no file URL is ever fetched.
 */
export async function decodeExplicitPosterSource(input:{
  useDirectly:unknown;
  base64:unknown;
  mime:unknown;
  isExistingEdit:boolean;
}):Promise<{image:Buffer;digest:string}|null>{
  if(input.useDirectly!==true){
    if(input.base64!==undefined||input.mime!==undefined)
      throw Error('Reference images are style-only unless direct use is explicitly selected.');
    return null;
  }
  if(input.isExistingEdit)
    throw Error('Edit your saved poster without replacing its source image.');
  if(typeof input.base64!=='string'||input.base64.length<80||
     input.base64.length>1_600_000||
     typeof input.mime!=='string'||!['image/png','image/jpeg','image/webp'].includes(input.mime))
    throw Error('Choose one valid image to use in your final poster.');
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64))
    throw Error('Invalid encoded reference image.');
  const raw=Buffer.from(input.base64,'base64');
  if(raw.length<64||raw.length>1_200_000)
    throw Error('The directly used image exceeds its safe size.');
  const image=sharp(raw,{limitInputPixels:20_000_000});
  const meta=await image.metadata();
  if(!['png','jpeg','webp'].includes(meta.format||'')||
     !meta.width||!meta.height||meta.width>6000||meta.height>6000)
    throw Error('The uploaded image format is invalid.');
  // FLUX.2 Klein's image-to-image mode requires input references under 512px;
  // normalize to a safe PNG and keep the original image off any public bucket.
  const safe=await image.resize(480,480,{fit:'inside',withoutEnlargement:true})
    .png({compressionLevel:8}).toBuffer();
  return {image:safe,digest:createHash('sha256').update(safe).digest('hex')};
}
