import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import CategoryContent from './CategoryContent';

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

// Helper to slugify names (matching sitemap logic)
const slugify = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/ & /g, '-')
    .replace(/ /g, '-')
    .replace(/,/g, '')
    .replace(/[^\w-]+/g, '');
};

async function getCategoryData(slug: string) {
  const supabase = await createClient();
  
  // Fetch all categories to find the match by slug
  const { data: categories } = await supabase
    .from('categories')
    .select('*');

  const category = categories?.find(c => slugify(c.name) === slug);
  
  if (!category) {
    // Check if it's a category from businesses table that doesn't exist in categories table
    const { data: businesses } = await supabase
      .from('businesses')
      .select('category')
      .eq('status', 'approved');
    
    const uniqueCats = Array.from(new Set((businesses || []).map(b => b.category).filter(Boolean)));
    const dynamicCat = uniqueCats.find(c => slugify(c as string) === slug);
    
    if (!dynamicCat) return null;
    return { name: dynamicCat, id: null };
  }
  
  return category;
}

async function getAllCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  return data || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryData(slug);

  if (!category) return { title: 'Category Not Found' };

  return {
    title: `Best ${category.name} in Sri Lanka | SLBI - SL Business Index`,
    description: `Explore the best ${category.name} in Sri Lanka. SLBI (SL Business Index) provides a verified list of businesses in Sri Lanka to help you connect with top-rated services.`,
    keywords: [category.name, 'Sri Lanka', 'SLBI', 'SL Business', 'Businesses in Sri Lanka', 'Verified Businesses'],
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryData(slug);
  const allCategories = await getAllCategories();

  if (!category) notFound();

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Minimalist Header */}
      <header className="bg-brand-dark py-12 md:py-20 px-6 overflow-hidden relative">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-sand/5 rounded-full blur-3xl -ml-24 -mb-24" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <nav className="flex items-center gap-2 text-brand-sand text-xs uppercase tracking-widest mb-8">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={10} strokeWidth={3} className="text-brand-sand/40" />
            <Link href="/category" className="hover:text-white transition-colors">Categories</Link>
            <ChevronRight size={10} strokeWidth={3} className="text-brand-sand/40" />
            <span className="text-white">{category.name}</span>
          </nav>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-6xl text-white mb-6 tracking-tight">
                {category.name}
              </h1>
              <p className="text-brand-sand text-lg leading-relaxed font-medium">
                Find the most trusted and verified {category.name} services across Sri Lanka. 
                Everything you need to connect with top-rated professionals.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main>
        <CategoryContent category={category} allCategories={allCategories} />
      </main>
    </div>
  );
}
