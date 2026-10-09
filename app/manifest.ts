import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SL Business Index',
    short_name: 'SLBI',
    description: 'Explore verified local businesses across Sri Lanka',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0F172A',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/pwa-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/pwa-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
