import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['framer-motion', 'lucide-react'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Next.js 16 otherwise coerces custom qualities to 75, negating thumbnail savings.
    qualities: [55, 65, 75],
    // The 512px thumbnail avoids fetching 640px images on many DPR=2 cards.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oofxhragafekazwjikae.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'thumbs.dreamstime.com',
      },
      {
        protocol: 'https',
        hostname: 't4.ftcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
      },
      {
        protocol: 'https',
        hostname: 'gemini.google.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
  // The old 40KB Creative AI page has been retired. A legacy bookmark gets
  // an immediate Next.js server redirect; no client HTML, fetch or flash.
  // Marketing App Store links directly to the owner-authorized new Studio.
  async redirects() {
    return [{
      source: '/vendor/marketing/design',
      destination: '/vendor/marketing/design/puter-lab',
      permanent: false,
    }];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      // Last matching header wins: microphone prompting is allowed only in
      // the owner-authenticated Poster Studio and its owner-only Puter lab.
      // Global camera and microphone access remain disabled elsewhere.
      {
        source: '/vendor/marketing/design/puter-lab',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
