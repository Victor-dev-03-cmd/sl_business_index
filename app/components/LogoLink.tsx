'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LogoLink() {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/');
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleAuxClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onAuxClick={handleAuxClick}
      className="transition-transform active:scale-95 cursor-pointer border-none bg-none p-0 flex items-center justify-center"
      type="button"
      aria-label="Home"
    >
      <Image
        src="/logo.svg"
        alt="SL Business Index Logo"
        width={180}
        height={60}
        className="drop-shadow-md object-contain"
        priority
        draggable={false}
        onContextMenu={handleContextMenu}
      />
    </button>
  );
}
