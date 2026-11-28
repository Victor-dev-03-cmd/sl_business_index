export const EMAIL_IMPORT_MAX_BYTES=2*1024*1024;
export const EMAIL_IMPORT_MAX_CONTACTS=5000;
export const EMAIL_IMPORT_SOURCES=['xlsx','csv','txt','paste'] as const;
export type ImportSource=typeof EMAIL_IMPORT_SOURCES[number];
export type ImportPreview={emails:string[];duplicates:number;invalid:number;scanned:number};
export function normalizeImportEmail(value:unknown):string|null{
 if(typeof value!=='string')return null;
 const email=value.trim().toLowerCase();
 if(email.length>254||email.length<6||! /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email))return null;
 const [local,domain]=email.split('@');
 if(local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..')||domain.split('.').some(p=>p.length>63||p.startsWith('-')||p.endsWith('-')))return null;
 return email;
}
export function previewImport(values:Iterable<string>):ImportPreview{
 const emails=new Set<string>();let duplicates=0,invalid=0,scanned=0;
 for(const value of values){
   if(++scanned>100000)throw Error('Too many cells. Split the file into smaller lists.');
   const text=value.trim();if(!text||!text.includes('@'))continue;
   const email=normalizeImportEmail(text);if(!email){invalid++;continue;}
   if(emails.has(email)){duplicates++;continue;}
   emails.add(email);if(emails.size>EMAIL_IMPORT_MAX_CONTACTS)throw Error('Maximum 5,000 unique emails per list. Split the file.');
 }
 return {emails:[...emails],duplicates,invalid,scanned};
}
export function parseContactText(text:string):ImportPreview{
 // Quote-aware cell splitting. No formulas, links or HTML are evaluated.
 const cells:string[]=[];let cell='',quoted=false;
 for(let i=0;i<text.length;i++){
   const c=text[i];
   if(c==='"'){
     if(quoted&&text[i+1]==='"'){cell+='"';i++;continue;}
     quoted=!quoted;continue;
   }
   if(!quoted&&/[;,\t\r\n]/.test(c)){cells.push(cell);cell='';if(cells.length>100000)throw Error('Too many cells.');}
   else cell+=c;
 }
 if(quoted)throw Error('Unclosed quotation in file.');
 cells.push(cell);
 // Plain whitespace-separated addresses are supported without mining arbitrary text.
 return previewImport(cells.flatMap(c=>{const tokens=c.trim().split(/\s+/);return tokens.length>1&&tokens.every(t=>t.includes('@'))?tokens:[c]}));
}
