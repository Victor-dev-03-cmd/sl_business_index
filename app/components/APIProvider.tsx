'use client';

import { APIProvider as GoogleMapsAPIProvider } from '@vis.gl/react-google-maps';
import React from 'react';

export default function APIProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div>
        <h1>Google Maps API Key is missing.</h1>
        <p>Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.</p>
        {children}
      </div>
    );
  }

  return (
    <GoogleMapsAPIProvider apiKey={apiKey} libraries={['places']}>
      {children}
    </GoogleMapsAPIProvider>
  );
}
