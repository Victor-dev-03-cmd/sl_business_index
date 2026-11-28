/** Provider-neutral do-not-email normalization. Does not imply subscription consent. */
export const EMAIL_SUPPRESSION_MAX_LENGTH=254;
const EMAIL=/^[^\s@,;<>]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
export function normalizeSuppressionEmail(value:unknown):string|null{
  if(typeof value!=='string'||value.length>300)return null;
  const email=value.trim().toLowerCase();
  if(email.length<5||email.length>EMAIL_SUPPRESSION_MAX_LENGTH||!EMAIL.test(email))return null;
  return email;
}
export function safeSuppressionCount(value:unknown):number|null{
  return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
}
