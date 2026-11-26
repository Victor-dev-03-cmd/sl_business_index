import 'server-only';
import type {User} from '@supabase/supabase-js';

/**
 * A single already-approved internal QA owner, not a global Pro override.
 * Call ONLY with the identity returned by server-side auth.getUser().
 * An exact authenticated email match is NOT enough: the caller also checks
 * the trusted, owner-scoped existing QA entitlement marker in the database.
 */
const APPROVED_QA_EMAIL='madhulaxsan@gmail.com';
export function isApprovedOwnerStudioIdentity(user:Pick<User,'id'|'email'|'email_confirmed_at'|'is_anonymous'>|null|undefined):boolean{
  return Boolean(user
    && typeof user.id==='string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)
    && typeof user.email==='string'
    && user.email.trim().toLowerCase()===APPROVED_QA_EMAIL
    && typeof user.email_confirmed_at==='string'
    && !Number.isNaN(Date.parse(user.email_confirmed_at))
    && user.is_anonymous!==true);
}
