import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('one low-friction notification onboarding for authenticated Android and desktop',()=>{
 const root=read('app/RootClientLayout.tsx'),nudge=read('app/components/PushOnboarding.tsx'),client=read('lib/push/client.ts');
 assert.match(root,/<PushOnboarding \/>/);
 assert.match(nudge,/Notification.permission==='default'/);
 assert.match(nudge,/devicePushOptedOut\(uid\)/);
 assert.match(nudge,/isIosDevice\(\)/);
 assert.match(nudge,/await enablePush\(uid\)/);
 assert.match(nudge,/Date.now\(\)\+week/);
 assert.doesNotMatch(nudge,/Notification.requestPermission\(/);
 assert.match(client,/export function devicePushOptedOut/);
});
test('first-party live presence does not require opt-in, precise location or third-party analytics',()=>{
 const source=read('app/components/LivePresenceProvider.tsx'),ga=read('app/components/GoogleAnalyticsTracker.tsx'),area=read('app/api/live-area/route.ts');
 assert.match(source,/getItem\(analyticsConsentKey\)!=='deny'/);
 assert.match(source,/active:true/);
 assert.match(source,/globalPrivacyControl/);
 assert.match(source,/fetch\('\/api\/live-area'/);
 assert.doesNotMatch(source,/navigator\.geolocation|requestPermission/);
 assert.match(area,/x-vercel-ip-country-region/);
 assert.match(ga,/if\(!preferencesOpen\)return null/);
 assert.match(ga,/consent==='allow'&&!blocked/);
});
test('account announcement is claimed once; guest persistence and audience filter stay intact',()=>{
 const source=read('components/GlobalAnnouncement.tsx'),sql=read('docs/growth/ANNOUNCEMENT_ONCE_REVIEW.sql');
 assert.match(source,/rpc\('slbi_claim_announcement'\)/);
 assert.match(source,/if\(loading\|\|!allowed\)return/);
 assert.match(source,/eq\('target_role','all'\)/);
 assert.match(source,/localStorage.setItem\(key,'true'\)/);
 assert.match(sql,/PRIMARY KEY\(user_id,announcement_id\)/);
 assert.match(sql,/auth.uid\(\)/);
 assert.match(sql,/ON CONFLICT DO NOTHING RETURNING/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public.slbi_claim_announcement\(\) TO authenticated/);
 assert.doesNotMatch(read('app/components/AnnouncementBar.tsx'),/sessionStorage/);
});
