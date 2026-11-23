import React from 'react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

/**
 * A compact blue verification seal with a high-contrast white check.
 * Presentation only: callers must independently enforce can_show_badge.
 */
const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className, size = 12 }) => (
  <span
    aria-hidden="true"
    className={cn("inline-flex shrink-0 items-center justify-center align-middle", className)}
    style={{ width: size + 7, height: size + 7 }}
  >
    <svg viewBox="0 0 24 24" className="h-full w-full drop-shadow-sm" focusable="false">
      <path
        fill="#1685F5"
        d="M12 1.7c1.2 0 2.05 1.15 3.17 1.45 1.12.3 2.53-.28 3.33.52s.22 2.21.52 3.33C19.32 8.95 20.47 9.8 20.47 11s-1.15 2.05-1.45 3.17c-.3 1.12.28 2.53-.52 3.33s-2.21.22-3.33.52c-1.12.3-1.97 1.45-3.17 1.45s-2.05-1.15-3.17-1.45c-1.12-.3-2.53.28-3.33-.52s-.22-2.21-.52-3.33C4.68 13.05 3.53 12.2 3.53 11s1.15-2.05 1.45-3.17c.3-1.12-.28-2.53.52-3.33s2.21-.22 3.33-.52C9.95 3.68 10.8 2.53 12 2.53Z"
        transform="translate(0 1)"
      />
      <path
        d="m7.35 12.1 3.05 3.05 6.2-6.35"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

export default VerifiedBadge;
