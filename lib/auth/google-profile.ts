import type { User } from '@supabase/supabase-js'

/**
 * Google OAuth identity is for display only. Roles and permissions still
 * come exclusively from protected application profile data.
 */
export function googleIdentityProfile(user: User): { name?: string; avatar?: string } {
  const identity = user.identities?.find(item => item.provider === 'google')
  const linked = Boolean(identity) ||
    user.app_metadata?.provider === 'google' ||
    (Array.isArray(user.app_metadata?.providers) &&
      user.app_metadata.providers.includes('google'))
  if (!linked) return {}

  const identityData = identity?.identity_data || {}
  const meta = user.user_metadata || {}
  const validText = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined

  const name = validText(identityData.full_name) || validText(identityData.name) ||
    validText(meta.full_name) || validText(meta.name)
  const image = validText(identityData.avatar_url) || validText(identityData.picture) ||
    validText(meta.avatar_url) || validText(meta.picture)
  let avatar: string | undefined
  try {
    if (image) {
      const url = new URL(image)
      if (url.protocol === 'https:' &&
          (url.hostname === 'googleusercontent.com' ||
           url.hostname.endsWith('.googleusercontent.com'))) {
        avatar = url.toString()
      }
    }
  } catch { /* Ignore invalid Google image URLs */ }

  return { name: name?.slice(0, 150), avatar }
}
