import { createClient } from '@/lib/supabase/server'
import { createClient as createIsolatedClient } from '@supabase/supabase-js'
import { validateBusinessLocation } from '@/lib/businessLocation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const reply = (status: number, data: Record<string, unknown>) => Response.json(data, {
  status, headers: { 'Cache-Control': 'private, no-store, max-age=0' },
})
const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length <= max ? value.trim() : ''
const staff = (role: unknown) => role === 'admin' || role === 'ceo'

/**
 * Never sign up / sign in on the administrator's browser client.
 * The isolated Auth Admin API creates a separate account, while the verified
 * staff SSR client inserts the listing under that account's UUID via RLS.
 */
export async function POST(request: Request) {
  let sameOrigin = false
  try {
    const origin = new URL(request.headers.get('origin') || '')
    const host = request.headers.get('host') || new URL(request.url).host
    const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':','')
    sameOrigin = origin.host === host && origin.protocol === protocol + ':' &&
      (protocol === 'https' || process.env.NODE_ENV !== 'production')
  } catch { /* Reject missing/invalid origin. */ }
  if (!sameOrigin) return reply(403, {error:'Cross-origin registration rejected.'})
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return reply(415, {error:'JSON required.'})
  }
  if (Number(request.headers.get('content-length') || 0) > 24000) return reply(413,{error:'Request too large.'})

  const client = await createClient()
  const {data:{user},error:authError} = await client.auth.getUser()
  if (authError || !user) return reply(401, {error:'Sign in as an administrator.'})
  const {data:profile,error:roleError} = await client.from('profiles').select('role').eq('id',user.id).maybeSingle()
  if (roleError) return reply(503,{error:'Admin access could not be verified.'})
  if (!staff(profile?.role)) return reply(403,{error:'Administrator access is required.'})

  let payload: Record<string,unknown>
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw) > 24000) return reply(413,{error:'Request too large.'})
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid')
    payload = value
  } catch { return reply(400,{error:'Invalid request.'}) }

  const email = text(payload.email,254).toLowerCase()
  const password = payload.password
  const existing = payload.existingAccount === true
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email === user.email?.toLowerCase() || payload.consent !== true ||
      (!existing && (typeof password !== 'string' || password.length < 12 || password.length > 128))) {
    return reply(400,{error:'Provide a separate owner email, an authorized registration, and a strong temporary password for new accounts.'})
  }
  const rawBusiness = payload.business
  if (!rawBusiness || typeof rawBusiness !== 'object' || Array.isArray(rawBusiness)) return reply(400,{error:'Business details required.'})
  const b = rawBusiness as Record<string,unknown>
  const name = text(b.name,200), category = text(b.category,200), ownerName = text(b.owner_name,150)
  const phone = text(b.phone,64), businessEmail = text(b.email,254)
  const address = text(b.address,500), detailedAddress = text(b.detailed_address,240)
  const lat = typeof b.latitude === 'number' ? b.latitude : NaN
  const lng = typeof b.longitude === 'number' ? b.longitude : NaN
  const registrationNumber = text(b.registration_number,100)
  const registered = b.is_registered === true
  const registrationValid = registered ?
    /^(PV|PB|PC|GA|GB|WP|W|CP|C|SP|S|NP|N|EP|E|NW|NC|UVA|U|SG)(\s|\/)?\d+$/i.test(registrationNumber) :
    /^(?:[5-9]\d{8}[vVxX]|(?:19|20)\d{10})$/.test(registrationNumber)
  const locationError = validateBusinessLocation({lat,lng,address}, detailedAddress, b.locationConfirmed === true)
  if (!name || !category || !ownerName || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail) ||
      typeof b.is_registered !== 'boolean' || !registrationValid || locationError) {
    return reply(400,{error:locationError || 'Complete the required business details and registration number.'})
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  const captchaSecret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY
  const token = text(payload.turnstileToken,4096)
  if (!url || !secret || !captchaSecret) return reply(503,{error:'Assisted registration is not configured for this environment.'})
  if (!token) return reply(400,{error:'Complete the security check.'})
  try {
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({secret:captchaSecret,response:token}),cache:'no-store',
      signal:AbortSignal.timeout(8000),
    })
    if (!verification.ok || !(await verification.json()).success) {
      return reply(403,{error:'Security check failed. Please refresh the verification and try again.'})
    }
  } catch { return reply(503,{error:'Security verification is temporarily unavailable.'}) }

  // Only accept image URLs from this project's business-logo bucket, uploaded
  // in this staff member's own path by the existing storage policy.
  const imageUrl = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value !== 'string' || value.length > 2048) throw new Error('invalid image')
    const parsed = new URL(value)
    if (parsed.origin !== new URL(url).origin ||
        !parsed.pathname.startsWith('/storage/v1/object/public/business-logos/' + user.id + '/')) throw new Error('invalid image')
    return parsed.toString()
  }
  let logo: string|null, image: string|null
  try { logo=imageUrl(b.logo_url); image=imageUrl(b.image_url) }
  catch { return reply(400,{error:'Invalid business image URL.'}) }

  const isolated = createIsolatedClient(url, secret, {
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  })
  let ownerId: string
  let confirmed = false
  if (existing) {
    // Resolve only an exact existing email and independently verify it against
    // Auth. Never reset passwords or modify another account's role here.
    const {data:owner,error:ownerError} = await client.from('profiles').select('id,role,email').eq('email',email).maybeSingle()
    if (ownerError || !owner || owner.id === user.id || !['customer','vendor'].includes(owner.role)) {
      return reply(409,{error:'No eligible existing owner account was found. Check the email or select new account.'})
    }
    const {data:identity,error:identityError} = await isolated.auth.admin.getUserById(owner.id)
    if (identityError || identity.user?.email?.toLowerCase() !== email) return reply(409,{error:'Owner email could not be verified.'})
    ownerId = owner.id
    confirmed = Boolean(identity.user.email_confirmed_at)
  } else {
    const {data:created,error:createError} = await isolated.auth.admin.createUser({
      email,password:password as string,email_confirm:false,
      user_metadata:{full_name:ownerName,username:ownerName.slice(0,80)},
    })
    if (createError || !created.user) return reply(409,{
      error:'Could not create a new owner account. If that email already has an account, select the existing-account option.',
    })
    ownerId = created.user.id
    confirmed = Boolean(created.user.email_confirmed_at)
    if (ownerId === user.id || created.user.email?.toLowerCase() !== email) return reply(503,{error:'Owner account identity could not be confirmed.'})
  }
  // Require the owner's independent, non-staff profile before assigning.
  const {data:ownerProfile,error:ownerRoleError} = await client.from('profiles').select('role').eq('id',ownerId).maybeSingle()
  if (ownerRoleError || !ownerProfile || !['customer','vendor'].includes(ownerProfile.role)) {
    return reply(409,{error:'Owner account exists but its profile is not ready. Do not recreate the account; retry using the existing-account option.'})
  }
  const id = crypto.randomUUID()
  const {error:insertError} = await client.from('businesses').insert({
    id,owner_id:ownerId,status:'pending',name,category,owner_name:ownerName,
    description:text(b.description,6000),phone,email:businessEmail,
    address,detailed_address:detailedAddress,latitude:lat,longitude:lng,
    location:'POINT('+lng+' '+lat+')',
    logo_url:logo,image_url:image,website_name:text(b.website_name,200),
    website_url:text(b.website_url,2048),working_hours:text(b.working_hours,1000),
    is_registered:registered,registration_number:registrationNumber,
  })
  if (insertError) {
    // Retain any newly created account rather than risking deletion of an
    // account on an ambiguous network failure. Staff can retry as existing.
    const {data:saved} = await client.from('businesses').select('id').eq('id',id).eq('owner_id',ownerId).maybeSingle()
    if (!saved) return reply(409,{error:'The owner account exists, but the listing could not be saved. Retry with the existing-account option after checking Admin Businesses.'})
  }

  let confirmationSent = false
  if (!confirmed) {
    try {
      const {error} = await isolated.auth.resend({type:'signup',email})
      confirmationSent = !error
    } catch { /* Listing is already saved; report delivery failure honestly. */ }
  }
  return reply(201,{success:true,businessId:id,existing,confirmationSent,requiresEmailVerification:!confirmed})
}
