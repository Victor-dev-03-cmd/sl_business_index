export declare const WA04_VERSION:'slbi-wa04-owner-review-v1';
export type WA04Locale='en'|'ta'|'si';
export type WA04Action={
 id:'campaign'|'email'|'leads'|'reviews'|'insights';href:string;title:string;
 kind:'review_only_external_blocked'|'read_link'|'draft_review';
 requiresFreshApproval:boolean;executed:false;
};
export type WA04Plan={
 ok:true;version:'slbi-wa04-owner-review-v1';locale:WA04Locale;
 actions:WA04Action[];summary:string;externallyDispatched:false;
 persisted:false;approved:false;
}|{ok:false;reason:'invalid_request'|'unsupported_sensitive_operation';locale?:WA04Locale};
export declare function resolveWA04Locale(raw:string,preferred?:'auto'|WA04Locale):WA04Locale;
export declare function planWA04OwnerRequest(input:unknown,preferred?:'auto'|WA04Locale):WA04Plan;
