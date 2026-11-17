/**
 * Browser-only Composer attachments. Uploads are optional, explicit and
 * analysed only after the owner presses "Analyze references".
 *
 * The existing server route validates actual byte signatures, auth, business
 * ownership and shared Gemini quota again; client checks are UX only.
 */
export const POSTER_REFERENCE_MAX_FILES=4;
export const POSTER_REFERENCE_MAX_FILE_BYTES=1_500_000;
export const POSTER_REFERENCE_MAX_TOTAL_BYTES=3_500_000;

export const POSTER_REFERENCE_MIMES=[
  'image/png','image/jpeg','image/webp','application/pdf','text/plain','text/markdown',
] as const;

export type PosterReferenceValidation={ok:true;files:File[]}|{ok:false;error:string};

const FILE_EXTENSION_TYPE:Record<string,string>={
  png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',
  pdf:'application/pdf',txt:'text/plain',md:'text/markdown',
};

export function classifyPosterReference(file:Pick<File,'type'|'name'>):string|null{
  const extension=file.name.toLowerCase().split('.').at(-1)||'';
  const expected=FILE_EXTENSION_TYPE[extension];
  if(!expected)return null;
  // Only infer empty MIME; never permit an extension to override an explicit
  // contradictory browser-provided type. The API validates file signatures.
  return !file.type||file.type==='application/octet-stream'?expected:
    file.type===expected?expected:null;
}

export function validatePosterReferences(current:File[],incoming:File[]):PosterReferenceValidation{
  const all=[...current,...incoming];
  if(all.length>POSTER_REFERENCE_MAX_FILES)
    return {ok:false,error:'Attach up to 4 images or documents per campaign.'};
  let total=0;
  for(const file of all){
    const type=classifyPosterReference(file);
    if(!type)
      return {ok:false,error:'Use PNG, JPG, WebP, PDF, TXT or MD files only.'};
    if(file.size<16||file.size>POSTER_REFERENCE_MAX_FILE_BYTES)
      return {ok:false,error:'Each attachment must be 16 bytes to 1.5 MB.'};
    total+=file.size;
  }
  if(total>POSTER_REFERENCE_MAX_TOTAL_BYTES)
    return {ok:false,error:'Combined attachments cannot exceed 3.5 MB.'};
  return {ok:true,files:all};
}

export function isPosterReferenceImage(file:Pick<File,'type'|'name'>):boolean{
  return Boolean(classifyPosterReference(file)?.startsWith('image/'));
}

export function posterReferenceFormData(businessId:string,files:File[]):FormData{
  const form=new FormData();
  form.set('businessId',businessId);
  for(const file of files){
    const type=classifyPosterReference(file);
    if(!type)throw Error('Unsupported reference type.');
    const normalized=type===file.type?file:
      new File([file],file.name,{type,lastModified:file.lastModified});
    form.append('files',normalized);
  }
  return form;
}

/** Puter input_images are opt-in; retain a validated PNG and do not upload
 * documents, send PDF bytes as images or accidentally use SVG/HTML assets.
 */
export async function preparePosterReferencePng(file:File):Promise<Blob>{
  if(!isPosterReferenceImage(file))throw Error('Select an image reference first.');
  const type=classifyPosterReference(file);
  if(type==='image/png')return file.type==='image/png'?file:new Blob([file],{type:'image/png'});
  const bitmap=await createImageBitmap(file);
  try{
    if(bitmap.width*bitmap.height>16_000_000)
      throw Error('Choose a reference image under 16 megapixels.');
    const canvas=document.createElement('canvas');
    canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Cannot prepare the selected reference image.');
    ctx.drawImage(bitmap,0,0);
    const blob=await new Promise<Blob>((resolve,reject)=>{
      canvas.toBlob(result=>result?resolve(result):
        reject(Error('Could not convert reference image.')),'image/png');
    });
    if(blob.size>15_000_000)throw Error('Reference PNG exceeds 15 MB.');
    return blob;
  }finally{bitmap.close();}
}

export function withPosterReferenceSummary(prompt:string,summary:string):string{
  const original=prompt.trim().slice(0,1200);
  const note=summary.trim().slice(0,850);
  if(!note)return original;
  const suffix='\nCreative references (untrusted style/context only): '+note;
  // Always preserve the vendor's original message over the AI summary.
  const space=1200-original.length;
  return original+(space>=80?suffix.slice(0,space):'');
}
