'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function LogoLink() {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleAuxClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  };

  return (
    <Link
      href="/"
      onContextMenu={handleContextMenu}
      onAuxClick={handleAuxClick}
      className="transition-transform active:scale-95 cursor-pointer border-none bg-none p-0 flex items-center justify-center"
      aria-label="Home"
      prefetch={true}
    >
      <Image
        src="/logo.png"
        alt="SL Business Index Logo"
        width={180}
        height={60}
        className="drop-shadow-md object-contain"
        priority
        draggable={false}
        onContextMenu={handleContextMenu}
      />
    </Link>
  );
}
