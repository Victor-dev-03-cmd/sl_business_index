import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Tags, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Helper to slugify names (matching slug page logic)
const slugify = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/ & /g, '-')
    .replace(/ /g, '-')
    .replace(/,/g, '')
    .replace(/[^\w-]+/g, '');
};

const IconComponent = ({ name, size = 24 }: { name: string | null, size?: number }) => {
  if (!name) return <Tags size={size} />;
  const Icon = (LucideIcons as any)[name];
  return Icon ? <Icon size={size} /> : <Tags size={size} />;
};

async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  return data || [];
}

export const metadata = {
  title: 'Business Categories in Sri Lanka | SLBI - SL Business Index',
  description: 'Browse all business categories in Sri Lanka. From healthcare to hospitality, find the best services in your industry.',
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Enhanced Minimalist Header */}
      <header className="bg-brand-dark py-12 md:py-20 px-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-sand/5 rounded-full blur-3xl -ml-24 -mb-24" />
        
        <div className="max-w-7xl mx-auto relative z-10 ">
          <nav className="flex items-center gap-2 text-brand-sand text-xs uppercase tracking-widest mb-8">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={10} strokeWidth={3} className="text-brand-sand" />
            <span className="text-white">Categories</span>
          </nav>
          
          <h1 className="text-4xl md:text-6xl text-white mb-6 tracking-tight ">
            Explore Categories
          </h1>
          <p className="text-brand-sand text-lg leading-relaxed max-w-2xl">
            Discover {categories.length} industry segments in Sri Lanka. 
            Connect with verified businesses across the island.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${slugify(category.name)}`}
              className="group bg-white border border-gray-300 rounded p-8 transition-all hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded bg-brand-blue border border-brand-blue/10 flex items-center justify-center text-brand-blue mb-6 group-hover:bg-brand-blue group-hover:text-white transition-all duration-300">
                  {category.image_url ? (
                    <div className="relative w-10 h-10 overflow-hidden rounded-lg">
                      <Image
                        src={category.image_url}
                        alt={category.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <IconComponent name={category.icon} size={32} />
                  )}
                </div>
                
                <h3 className="text-lg text-gray-900 mb-2 group-hover:text-brand-blue transition-colors">
                  {category.name}
                </h3>
                
                <div className="flex items-center gap-1.5 text-brand-blue text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                  Browse List <ChevronRight size={12} strokeWidth={3} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-24 bg-white border border-dashed border-gray-100 rounded">
            <Tags size={64} className="mx-auto text-gray-100 mb-6" strokeWidth={1} />
            <h3 className="text-xl text-gray-900">No categories found</h3>
            <p className="text-gray-400 mt-2 max-w-xs mx-auto">
              Please check back later as we are constantly updating our directory.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
