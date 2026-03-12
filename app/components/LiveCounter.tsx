'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Users } from 'lucide-react'

export default function LiveCounter() {
  const [count, setCount] = useState(1)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'user',
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const totalUsers = Object.keys(state).length
        setCount(totalUsers > 0 ? totalUsers : 1)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Handle join
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Handle leave
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-pulse">
      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
        Live Now: {count}
      </span>
    </div>
  )
}
