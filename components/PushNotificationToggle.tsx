// components/PushNotificationToggle.tsx
'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import { getVapidPublicKey } from '@/lib/vapid'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true)
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub)
        })
      })
    }
  }, [])

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready

      if (isSubscribed) {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()
          await fetch('/api/push/unsubscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          })
        }
        setIsSubscribed(false)
        toast.success('Push notifications disabled')
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          toast.error('Notification permission denied')
          return
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()),
        })

        const key = subscription.getKey('p256dh')
        const authKey = subscription.getKey('auth')

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : '',
            auth: authKey ? btoa(String.fromCharCode(...new Uint8Array(authKey))) : '',
          }),
        })

        setIsSubscribed(true)
        toast.success('Push notifications enabled')
      }
    } catch (err) {
      toast.error('Failed to update notification settings')
    } finally {
      setIsLoading(false)
    }
  }

  if (!supported) return null

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      title={isSubscribed ? 'Disable push notifications' : 'Enable push notifications'}
      className="p-2 rounded-lg transition-colors hover:bg-gray-100 disabled:opacity-50"
    >
      {isSubscribed ? (
        <Bell size={20} className="text-brand-blue" />
      ) : (
        <BellOff size={20} className="text-gray-400" />
      )}
    </button>
  )
}
