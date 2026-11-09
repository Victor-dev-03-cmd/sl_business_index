import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SL Business Index',
    short_name: 'SLBI',
    description: 'Explore verified local businesses across Sri Lanka',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F3ED',
    theme_color: '#1B3430',
    orientation: 'portrait',
    icons: [
      {
        src: '/slbi-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
