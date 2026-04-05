'use client';

import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';

export default function LogoLink({ className = "" }: { className?: string }) {
  const { data: settings } = useQuery({
    queryKey: ['site-settings', 'general'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('logo_url, logo_text, logo_width, logo_height')
        .eq('id', 1)
        .single();

      if (error) return null;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

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
      {settings?.logo_url ? (
        <Image
          src={settings.logo_url}
          alt={settings.logo_text || "SLBI - SL Business Index Logo"}
          width={settings.logo_width || 180}
          height={settings.logo_height || 60}
          className="drop-shadow-md object-contain"
          style={{ 
            maxWidth: '100%', 
            height: 'auto',
            width: settings.logo_width ? `${settings.logo_width}px` : '180px'
          }}
          priority
          draggable={false}
          onContextMenu={handleContextMenu}
        />
      ) : (
        <Image
          src="/logo.png"
          alt="SLBI - SL Business Index Logo"
          width={180}
          height={60}
          className="drop-shadow-md object-contain"
          priority
          draggable={false}
          onContextMenu={handleContextMenu}
        />
      )}
    </Link>
  );
}
