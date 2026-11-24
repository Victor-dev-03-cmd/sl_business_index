/** Explicit user-click copying only. Never publishes, saves or contacts providers. */
export type CopyResult='copied'|'failed'|'unavailable';
export async function copyCampaignCaption(text: string, writeText?: (text:string)=>Promise<void>):Promise<CopyResult>{
  if(typeof text!=='string'||!text.trim()||text.length>3000||!writeText)return 'unavailable';
  try{await writeText(text);return 'copied';}catch{return 'failed';}
}
