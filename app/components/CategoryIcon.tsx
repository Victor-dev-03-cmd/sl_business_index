import {
  Airplay, BookOpenText, Briefcase, Building, Building2, Cpu,
  HardHat, HeartPulse, PartyPopper, Plane, ShoppingCart, Siren,
  Star, Tags, Users, type LucideIcon,
} from "lucide-react";

const categoryIcons: Record<string, LucideIcon> = {
  Airplay, AirplayIcon: Airplay,
  BookOpenText, BookOpenTextIcon: BookOpenText,
  Briefcase, Building, Building2, Cpu, HardHat, HeartPulse,
  PartyPopper, Plane, ShoppingCart, Siren, Star, Tags, Users,
};

/** Explicit, tree-shakeable catalog of database-driven category icons. */
export default function CategoryIcon({
  name,
  className,
}: { name: string | null; className?: string }) {
  const Icon = (name && categoryIcons[name]) || Tags;
  return <Icon aria-hidden="true" className={className} />;
}
