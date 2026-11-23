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
      <circle cx="12" cy="12" r="10.5" fill="#1685F5" />
      <path
        d="M7.1 12.2 10.35 15.35 17.05 8.65"
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
