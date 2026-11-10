import BrandIcon from "./BrandIcon";

// The category data stores legacy Lucide component names. Keep those database
// values stable while rendering the requested premium Iconsax icon set.
// Fallback icons never depend on dynamic imports or an external icon CDN.
const categoryIcons: Readonly<Record<string, string>> = {
  Airplay: "monitor",
  AirplayIcon: "monitor",
  BookOpenText: "book-1",
  BookOpenTextIcon: "book-1",
  Briefcase: "briefcase",
  Building: "building",
  Building2: "buildings-2",
  Cpu: "cpu",
  HardHat: "buildings",
  HeartPulse: "heart",
  PartyPopper: "calendar",
  Plane: "airplane",
  ShoppingCart: "shopping-cart",
  Siren: "shield",
  Star: "star-1",
  Tags: "category-2",
  Users: "people",
};

/** One consistent Iconsax appearance for all public category surfaces. */
export default function CategoryIcon({
  name,
  className,
  size = 20,
}: { name: string | null; className?: string; size?: number }) {
  const iconName = (name && categoryIcons[name]) || "category-2";
  return <BrandIcon name={iconName} size={size} className={className} />;
}
