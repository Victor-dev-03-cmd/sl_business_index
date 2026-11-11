/** Strict customer-enquiry validation. No cross-site redirect or untrusted lead source. */
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type ValidLead = {
  requestId:string;businessId:string;name:string;email:string;phone:string;
  message:string;turnstileToken:string;consent:true;
};
export type LeadCheck = {ok:true;value:ValidLead}|{ok:false;reason:string};
export function validateLeadSubmission(input:unknown):LeadCheck{
  if(!input||Array.isArray(input)||typeof input!=='object')return {ok:false,reason:'invalid-body'};
  const raw=input as Record<string,unknown>;
  if(typeof raw.request_id!=='string'||!uuid.test(raw.request_id))return {ok:false,reason:'invalid-request-id'};
  if(typeof raw.business_id!=='string'||!uuid.test(raw.business_id))return {ok:false,reason:'invalid-business-id'};
  if(raw.consent!==true)return {ok:false,reason:'consent-required'};
  if(typeof raw.name!=='string'||raw.name.trim().length<2||raw.name.trim().length>100)return {ok:false,reason:'invalid-name'};
  if(typeof raw.email!=='string'||raw.email.trim().length>160||!emailPattern.test(raw.email.trim()))return {ok:false,reason:'invalid-email'};
  if(typeof raw.phone!=='string'||raw.phone.trim().length<5||raw.phone.trim().length>24||!/^[+\d\s().-]+$/.test(raw.phone.trim()))return {ok:false,reason:'invalid-phone'};
  if(typeof raw.message!=='string'||raw.message.trim().length<3||raw.message.trim().length>3000)return {ok:false,reason:'invalid-message'};
  if(typeof raw.turnstile_token!=='string'||raw.turnstile_token.length<10||raw.turnstile_token.length>2048)return {ok:false,reason:'invalid-challenge'};
  return {ok:true,value:{
    requestId:raw.request_id,businessId:raw.business_id,name:raw.name.trim(),
    email:raw.email.trim().toLowerCase(),phone:raw.phone.trim(),message:raw.message.trim(),
    turnstileToken:raw.turnstile_token,consent:true,
  }};
}
