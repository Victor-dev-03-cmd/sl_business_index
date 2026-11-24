/** Free, explicit user-click caption sharing. Never posts, saves or contacts providers. */
export type ShareResult='sheet_closed'|'copied'|'canceled'|'failed'|'unavailable';
export type ShareCaption={title:string;text:string};
export type SharePorts={
  share?:(content:ShareCaption)=>Promise<void>;
  copy?:(text:string)=>Promise<void>;
};
export async function shareCampaignCaption(input:ShareCaption,ports:SharePorts):Promise<ShareResult>{
  const title=typeof input.title==='string'?input.title.trim():'';
  const text=typeof input.text==='string'?input.text.trim():'';
  if(!title||title.length>150||!text||text.length>3000)return 'unavailable';
  if(ports.share){
    try{
      // Synchronously invoke share() BEFORE the first await to retain mobile user activation.
      await ports.share({title,text});
      return 'sheet_closed'; // Never claim the message was actually posted.
    }catch(error){
      if(error!==null&&typeof error==='object'&&'name' in error&&error.name==='AbortError')return 'canceled';
      return 'failed'; // Never retry/copy after share denial or cancellation.
    }
  }
  if(ports.copy){
    try{await ports.copy(text);return 'copied';}catch{return 'failed';}
  }
  return 'unavailable';
}
