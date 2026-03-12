'use client'

import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

declare global {
  interface Window {
    clarity: (...args: any[]) => void;
  }
}

export default function ClarityTracker() {
  // Clarity Project ID should be set in .env.local
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID || "placeholder"

  useEffect(() => {
    if (!clarityId || clarityId === "placeholder") {
      console.warn("Microsoft Clarity ID is missing. Set NEXT_PUBLIC_CLARITY_ID in your environment variables.")
      return
    }

    // Standard Clarity tracking code
    // @ts-ignore
    (function(c,l,a,r,i,t,y){
        // @ts-ignore
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        // @ts-ignore
        t=l.createElement(r);
        // @ts-ignore
        t.async=1;
        // @ts-ignore
        t.src="https://www.clarity.ms/tag/"+i;
        // @ts-ignore
        y=l.getElementsByTagName(r)[0];
        // @ts-ignore
        y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", clarityId);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Identify user in Clarity
    const identifyUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile) {
          window.clarity("identify", user.id)
          window.clarity("set", "user_id", user.id)
          window.clarity("set", "role", profile.role)
        }
      }
    }

    identifyUser()
  }, [clarityId])

  return null
}
