'use client';

import { createElement, useEffect, useRef, useState } from 'react';
import {
  ArrowDown2, ArrowUp2, Building2, CalendarClock, Phone, ChartNoAxesCombined,
  CheckCircle2, ChevronLeft, ChevronRight, CirclePlus, Coins, Download,
  Eye, Zap, Globe, House, Mail, Menu, MessageSquareText, Users, RefreshCw,
  Search, Settings2, ShieldCheck, Store, PanelLeft, Star,
  TrendingUp, CircleX, type LucideIcon
} from 'lucide-react';

// Iconsax is a custom element. Register it once on the client.
// A Lucide SVG fallback guarantees navigation and action controls remain visible
// if a browser, chunk, or the icon name prevents Iconsax from drawing.
let registration: Promise<unknown> | undefined;
const fallbacks: Record<string, LucideIcon> = {
  'category': Building2,
  'chart': ChartNoAxesCombined,
  'eye': Eye,
  'call': Phone,
  'message-text': MessageSquareText,
  'star': Star,
  'refresh': RefreshCw,
  'add': CirclePlus,
  'add-circle': CirclePlus,
  'arrow-right-2': ChevronRight,
  'arrow-left-2': ChevronLeft,
  'arrow-down-2': ArrowDown2,
  'arrow-up-2': ArrowUp2,
  'shop': Store,
  'people': Users,
  'flash': Zap,
  'scan-barcode': Search,
  'card': Coins,
  'setting-2': Settings2,
  'search-normal': Search,
  'document-download': Download,
  'shield-tick': ShieldCheck,
  'status-up': TrendingUp,
  'home': House,
  'close-circle': CircleX,
  'menu': Menu,
  'sidebar-left': PanelLeft,
  'calendar': CalendarClock,
  'global': Globe,
  'sms': Mail,
  'tick-circle': CheckCircle2,
};
export type IconsaxName = string;

export default function IconsaxIcon({
  name, size = 18, variant = 'linear', className = '', color = 'currentColor',
}: {
  name: IconsaxName;
  size?: number;
  variant?: 'linear' | 'bold' | 'bulk' | 'broken' | 'outline' | 'twotone';
  className?: string;
  color?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const Fallback = fallbacks[name] || CirclePlus;

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | undefined;
    setRendered(false);

    const attach = async () => {
      if (!registration) {
        registration = import('iconsax').catch(error => {
          registration = undefined;
          console.error('Iconsax registration failed; using icon fallback.', error);
        });
      }
      await registration;
      if (cancelled || !customElements.get('iconsax-icon')) return;
      const node = ref.current;
      if (!node) return;

      const check = () => {
        if (cancelled) return;
        const svg = node.shadowRoot?.querySelector('svg') || node.querySelector('svg');
        if (svg && !svg.querySelector('title[data-error]')) setRendered(true);
      };
      check();
      observer = new MutationObserver(check);
      observer.observe(node.shadowRoot || node, { childList: true, subtree: true, attributes: false });
    };
    void attach();
    return () => { cancelled = true; observer?.disconnect(); };
  }, [name, variant]);

  return (
    <span className={className} style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0, verticalAlign: 'middle', color }}>
      <Fallback size={size} strokeWidth={1.9} aria-hidden="true"
        style={{ position: 'absolute', inset: 0, opacity: rendered ? 0 : 1 }} />
      {createElement('iconsax-icon', {
        ref, name, type: variant, size: String(size), color,
        'aria-hidden': 'true',
        style: { display: 'inline-flex', width: size, height: size, opacity: rendered ? 1 : 0 },
      })}
    </span>
  );
}
