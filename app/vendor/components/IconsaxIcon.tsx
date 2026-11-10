'use client';

import { createElement, useEffect } from 'react';

// Iconsax v0.1.1 is a web component, not a React icon-component package.
// Register the custom element only in the browser to keep Next.js SSR safe.
let registration: Promise<unknown> | undefined;

export type IconsaxName = string;

export default function IconsaxIcon({
  name,
  size = 18,
  variant = 'linear',
  className = '',
  color = 'currentColor',
}: {
  name: IconsaxName;
  size?: number;
  variant?: 'linear' | 'bold' | 'bulk' | 'broken' | 'outline' | 'twotone';
  className?: string;
  color?: string;
}) {
  useEffect(() => {
    if (!registration) {
      registration = import('iconsax').catch(error => {
        registration = undefined;
        console.error('Iconsax registration failed', error);
      });
    }
  }, []);

  return createElement('iconsax-icon', {
    name, type: variant, size: String(size), color,
    class: className,
    'aria-hidden': 'true',
    style: { display: 'inline-flex', width: size, height: size, flexShrink: 0 },
  });
}
