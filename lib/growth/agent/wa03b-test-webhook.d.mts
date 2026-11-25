/** TypeScript types for no-side-effect Meta test-number webhook. */
export const WA03B_KEYS:readonly string[];
export function inspectWA03BConfig(env:NodeJS.ProcessEnv):
 {enabled:boolean;ready:boolean;missing:string[];mode:string};
export function verifyWA03BChallenge(query:string,env:NodeJS.ProcessEnv):
 {ok:true;challenge:string}|{ok:false;code:string};
export function inspectWA03BInbound(
 raw:Uint8Array,signature:string|null,env:NodeJS.ProcessEnv,nowMs:number):
 {ok:true;eventCount:number;messageStored:false;rawPhoneStored:false;modelInvoked:false;
 businessLinked:false;outboundPerformed:false}|{ok:false;code:string};
