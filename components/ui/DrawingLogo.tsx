"use client"

import React, { useEffect, useRef } from 'react';

// Define props to accept a className for styling
interface SlbiDrawingProps {
  className?: string;
}

const SlbiDrawing: React.FC<SlbiDrawingProps> = ({ className }) => {
  const animationRef = useRef<any | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    import('animejs').then(module => {
      const anime = module.default;
      if (svgRef.current) {
        const paths = svgRef.current.querySelectorAll('path');
        animationRef.current = anime({
          targets: paths,
          strokeDashoffset: [anime.setDashoffset, 0],
          easing: 'easeInOutSine',
          duration: 1500,
          delay: (el: any, i: number) => i * 250,
          direction: 'normal',
          loop: false
        });
      }
    });
  }, []);

  return (
    // The wrapper div is removed to inherit the parent's background
    <svg
      ref={svgRef}
      width="280"
      height="80"
      viewBox="0 0 280 80"
      fill="none"
      stroke="currentColor" // Use the text color of the parent
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className} // Apply passed className
    >
      {/* S */}
      <path d="M 50 15 C 20 15, 20 45, 50 45 L 50 45 C 80 45, 80 75, 50 75" />
      {/* L */}
      <path d="M 100 15 L 100 75 L 130 75" />
      {/* B */}
      <path d="M 150 15 L 150 75 M 150 15 C 180 15, 180 45, 150 45 M 150 45 C 185 45, 185 75, 150 75" />
      {/* I */}
      <path d="M 200 15 L 200 75" />
    </svg>
  );
}

export default SlbiDrawing;