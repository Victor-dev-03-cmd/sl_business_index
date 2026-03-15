import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { User, SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'edge'

type Variables = {
  user: User | null
  supabase: SupabaseClient
}

const app = new Hono<{ Variables: Variables }>().basePath('/api')

// Supabase Auth Middleware
app.use('*', async (c, next) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return getCookie(c, name)
        },
        set(name: string, value: string, options: CookieOptions) {
          setCookie(c, name, value, {
            ...options,
            path: options.path || '/',
          } as any)
        },
        remove(name: string, options: CookieOptions) {
          deleteCookie(c, name, {
            ...options,
            path: options.path || '/',
          } as any)
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  c.set('user', user)
  c.set('supabase', supabase)
  await next()
})

// Existing API routes
app.get('/geocode', async (c) => {
  const q = c.req.query('q')
  if (!q) {
    return c.json({ error: 'Query is required' }, 400)
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&extratags=1&limit=10`,
      {
        headers: {
          'User-Agent': 'SL-Business-Index-App',
          'Accept-Language': 'en,ta,si',
        },
      }
    )
    const data = await response.json()
    return c.json(data)
  } catch (error) {
    return c.json({ error: 'Failed to fetch' }, 500)
  }
})

app.post('/google-distance', async (c) => {
  const body = await c.req.json()
  const { origins, destinations } = body
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_PLACES_API_KEY

  if (!origins || !destinations || origins.length === 0 || destinations.length === 0) {
    return c.json({ error: 'Missing origins or destinations' }, 400)
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return c.json({ error: 'API configuration error' }, 500)
  }

  const originsStr = origins.map((o: any) => `${o.lat},${o.lng}`).join('|')
  const destinationsStr = destinations.map((d: any) => `${d.lat},${d.lng}`).join('|')

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
  url.searchParams.append('origins', originsStr)
  url.searchParams.append('destinations', destinationsStr)
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY)

  const response = await fetch(url.toString())
  const data = await response.json()

  if (data.status !== 'OK') {
    return c.json({ error: `Google Distance Matrix API error: ${data.status}` }, 500)
  }

  const rows = data.rows[0].elements.map((element: any) => ({
    distance: element.distance?.value || 0,
    distanceText: element.distance?.text || 'Unknown',
    duration: element.duration?.value || 0,
    durationText: element.duration?.text || 'Unknown',
    status: element.status,
  }))

  return c.json({ distances: rows })
})

app.post('/google-places/nearby', async (c) => {
  const body = await c.req.json()
  let { latitude, longitude, location, query, radius } = body
  const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!GOOGLE_PLACES_API_KEY) {
    return c.json({ error: 'API configuration error' }, 500)
  }

  if (location && (!latitude || !longitude)) {
    const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    geocodeUrl.searchParams.append('address', `${location}, Sri Lanka`)
    geocodeUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY)

    const geocodeRes = await fetch(geocodeUrl.toString())
    const geocodeData = await geocodeRes.json()
    if (geocodeData.status === 'OK' && geocodeData.results[0]) {
      latitude = geocodeData.results[0].geometry.location.lat
      longitude = geocodeData.results[0].geometry.location.lng
    } else {
      return c.json({ error: `Could not find coordinates for ${location}` }, 400)
    }
  }

  if (!latitude || !longitude) {
    return c.json({ error: 'Missing location data' }, 400)
  }

  const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  searchUrl.searchParams.append('location', `${latitude},${longitude}`)
  searchUrl.searchParams.append('radius', radius.toString())
  searchUrl.searchParams.append('keyword', query)
  searchUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY)

  const response = await fetch(searchUrl.toString())
  const data = await response.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return c.json({ error: `Google Places API error: ${data.status}` }, 500)
  }

  const places = data.results?.map((result: any) => ({
    id: result.place_id,
    name: result.name,
    address: result.vicinity,
  })) || []

  return c.json({ places })
})

app.post('/google-places/details', async (c) => {
  const body = await c.req.json()
  const { placeId } = body
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

  if (!placeId) {
    return c.json({ error: 'Missing required parameter: placeId' }, 400)
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return c.json({ error: 'API configuration error' }, 500)
  }

  const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  detailsUrl.searchParams.append('place_id', placeId)
  detailsUrl.searchParams.append('fields', 'name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,opening_hours,photos,geometry,url')
  detailsUrl.searchParams.append('key', GOOGLE_PLACES_API_KEY)

  const response = await fetch(detailsUrl.toString())
  const data = await response.json()

  if (data.status !== 'OK') {
    return c.json({ error: `Google Places API error: ${data.status}` }, 500)
  }

  const result = data.result
  const place = {
    id: placeId,
    name: result.name,
    address: result.formatted_address,
    rating: result.rating || 0,
    reviewCount: result.user_ratings_total || 0,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    phone: result.formatted_phone_number || null,
    website_url: result.website || null,
    photoUrl: result.photos
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${result.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
      : null,
    openingHours: result.opening_hours
      ? {
          open: result.opening_hours.open_now,
          weekdayText: result.opening_hours.weekday_text || [],
        }
      : undefined,
    mapsUrl: result.url || null,
  }

  return c.json({ place })
})

// Analytics Logging Endpoint
app.post('/analytics/log', async (c) => {
  const supabase = c.get('supabase')
  const user = c.get('user')
  const body = await c.req.json()
  const { business_id, event_type, city, metadata } = body

  if (!business_id || !event_type) {
    return c.json({ error: 'business_id and event_type are required' }, 400)
  }

  const { error } = await supabase
    .from('analytics_logs')
    .insert({
      business_id,
      event_type,
      user_id: user?.id || null,
      city,
      metadata: metadata || {}
    })

  if (error) {
    console.error('Error logging analytics:', error)
    return c.json({ error: 'Failed to log analytics' }, 500)
  }

  return c.json({ success: true })
})

// Review Moderation Endpoint (Groq AI)
app.post('/reviews/moderate', async (c) => {
  const { comment } = await c.req.json()
  const GROQ_API_KEY = process.env.GROQ_API_KEY

  if (!comment) {
    return c.json({ error: 'Comment is required' }, 400)
  }

  if (!GROQ_API_KEY) {
    console.error('GROQ_API_KEY is missing')
    return c.json({ error: 'Moderation service unavailable' }, 500)
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a strict review moderator. Analyze reviews for profanity, spam, or hate speech. Always respond in valid JSON format only.'
          },
          {
            role: 'user',
            content: `Analyze the following review for profanity, spam, or hate speech. If it is safe, return a JSON: {"status": "safe", "sentiment": "positive/negative"}. If it is unsafe, return {"status": "blocked", "reason": "reason_here"}. Review: "${comment}"`
          }
        ],
        response_format: { type: 'json_object' }
      })
    })

    const data = await response.json()
    const moderationResult = JSON.parse(data.choices[0].message.content)
    
    return c.json(moderationResult)
  } catch (error) {
    console.error('Groq API Error:', error)
    return c.json({ error: 'Moderation failed' }, 500)
  }
})

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
