import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className, size = 12 }) => {
  return (
    <div 
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-blue-500 text-white shrink-0",
        className
      )}
      style={{ width: size + 4, height: size + 4 }}
    >
      <Check size={size} strokeWidth={4} />
    </div>
  );
};

export default VerifiedBadge;
