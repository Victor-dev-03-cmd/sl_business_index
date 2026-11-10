import BrandIcon from "./BrandIcon";

// Category cards render SVG icons instead of database PNG thumbnails.
const iconNames: Readonly<Record<string, string>> = {
  Airplay:"monitor", AirplayIcon:"monitor", BookOpenText:"book-1",
  BookOpenTextIcon:"book-1", Briefcase:"briefcase", Building:"building",
  Building2:"buildings-2", Cpu:"cpu", HardHat:"buildings", HeartPulse:"heart",
  PartyPopper:"calendar", Plane:"airplane", ShoppingCart:"shopping-cart",
  Siren:"shield", Star:"star-1", Tags:"category-2", Users:"people",
};

function resolveCategoryIcon(name: string | null, categoryName?: string): string {
  const label = (categoryName || "").toLowerCase();
  if (/health|medical|wellness|beauty|baby|pet|care/.test(label)) return "heart";
  if (/professional|finance|bank|insuranc|legal|consult/.test(label)) return "briefcase";
  if (/educat|school|academy|tuition|training/.test(label)) return "book-1";
  if (/travel|tourism|airline/.test(label)) return "airplane";
  if (/transport|automotive|vehicle|logistic|delivery/.test(label)) return "location";
  if (/food|restaurant|dining|hotel|retail|shopping|store|market/.test(label)) return "shop";
  if (/technolog|electronic|computer|repair|telecom|digital|software/.test(label)) return "cpu";
  if (/construction|industr|manufactur|hardware|engineering|interior/.test(label)) return "buildings-2";
  if (/event|wedding|entertainment|leisure|sport/.test(label)) return "calendar";
  if (/advertis|design|media|photograph/.test(label)) return "monitor";
  if (/manpower|labor|cleaning|staff|employment/.test(label)) return "people";
  if (/security|government|religious/.test(label)) return "shield";
  return (name && iconNames[name]) || "category-2";
}

export default function CategoryIcon({
  name, categoryName, className, size = 20,
}: {
  name: string | null;
  categoryName?: string;
  className?: string;
  size?: number;
}) {
  return <BrandIcon name={resolveCategoryIcon(name, categoryName)} size={size} className={className} />;
}
