/** Compare an owner-entered CTA phone to the CURRENT verified business
 * contact before any Growth Credit reservation. Never invent or copy
 * unverified telephone numbers into generated advertising. */
export function normalizedSriLankaPhone(value:string):string{
  const digits=value.replace(/\D/g,'');
  return /^94\d{9}$/.test(digits)?'0'+digits.slice(2):digits;
}
export function unverifiedCtaPhone(cta:string,verifiedPhone:string):boolean{
  const candidates=cta.match(/\+?\d[\d\s().-]{5,}\d/g)||[];
  const expected=normalizedSriLankaPhone(verifiedPhone);
  return candidates.some(value=>{
    const digits=normalizedSriLankaPhone(value);
    return digits.length>=7&&(expected.length<7||digits!==expected);
  });
}
