/**
 * Script to add 8 main category groups to the database
 * Run with: npx tsx scripts/add-main-category-groups.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MAIN_CATEGORY_GROUPS = [
  { name: 'Manpower Services', icon: 'Users', sort_order: 1 },
  { name: 'Care & Lifestyle', icon: 'HeartPulse', sort_order: 2 },
  { name: 'Professional & Finance', icon: 'Briefcase', sort_order: 3 },
  { name: 'Construction & Industrial', icon: 'HardHat', sort_order: 4 },
  { name: 'Technical & Electronics', icon: 'Cpu', sort_order: 5 },
  { name: 'Events, Food & Leisure', icon: 'PartyPopper', sort_order: 6 },
  { name: 'Travel & Transport', icon: 'Plane', sort_order: 7 },
  { name: 'Retail & Others', icon: 'ShoppingCart', sort_order: 8 },
];

const SUBCATEGORY_MAPPING: Record<string, string[]> = {
  'Manpower Services': [
    'Mason', 'Painter', 'Plumber', 'Carpenter', 'Welder',
    'Electrician', 'Cleaner', 'Laborer / Helper'
  ],
  'Care & Lifestyle': [
    'Health & Medical', 'Baby Care', 'Pet Care',
    'Beauty & Health', 'Religious Organization'
  ],
  'Professional & Finance': [
    'Banking & Finance', 'Insurance Services', 'Financial Services',
    'Professional Services', 'Government & Services', 'Media & Advertising'
  ],
  'Construction & Industrial': [
    'Construction Services', 'Hardware Equipment', 'Industry & Manufacturing',
    'Interior Design Services', 'Office Equipment & Services'
  ],
  'Technical & Electronics': [
    'Electronic Pheripherals', 'Electrical Equipment and Services',
    'Repairing & Services', 'Media & Communications'
  ],
  'Events, Food & Leisure': [
    'Weddings Services', 'Food & Dining', 'Arts, Entertainment & Leisure',
    'Hotels & Restaurants'
  ],
  'Travel & Transport': [
    'Travel & Tourism', 'Travel & Transportation',
    'Vehicles & Automative', 'Telecommunication Services'
  ],
  'Retail & Others': [
    'Shopping & Retail', 'Agriculture Products', 'Sports & Recreation',
    'Home Appliances & Services', 'Educational institutes & Services'
  ],
};

async function addMainCategoryGroups() {
  console.log('🚀 Starting to add main category groups...\n');

  try {
    // Step 1: Insert main category groups
    console.log('📝 Step 1: Inserting main category groups...');
    const mainGroupResults = [];

    for (const group of MAIN_CATEGORY_GROUPS) {
      const { data, error } = await supabase
        .from('categories')
        .upsert(
          {
            name: group.name,
            icon: group.icon,
            parent_id: null,
            sort_order: group.sort_order,
            keywords: [group.name.toLowerCase(), 'main group']
          },
          { onConflict: 'name', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) {
        console.error(`  ❌ Error inserting ${group.name}:`, error.message);
      } else {
        console.log(`  ✅ Added/Updated: ${group.name} (ID: ${data.id})`);
        mainGroupResults.push(data);
      }
    }

    console.log(`\n✨ Inserted ${mainGroupResults.length} main category groups\n`);

    // Step 2: Link existing categories to parent groups
    console.log('📝 Step 2: Linking subcategories to parent groups...');
    let linkedCount = 0;

    for (const [parentName, subcategoryNames] of Object.entries(SUBCATEGORY_MAPPING)) {
      // Find parent category
      const { data: parentCat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', parentName)
        .single();

      if (!parentCat) {
        console.log(`  ⚠️  Parent category not found: ${parentName}`);
        continue;
      }

      console.log(`\n  🔗 Linking to: ${parentName}`);

      for (const subName of subcategoryNames) {
        // Find and update subcategory
        const { data: updated, error } = await supabase
          .from('categories')
          .update({ parent_id: parentCat.id })
          .eq('name', subName)
          .select();

        if (error) {
          console.log(`    ⚠️  Could not link: ${subName} (${error.message})`);
        } else if (updated && updated.length > 0) {
          console.log(`    ✅ Linked: ${subName}`);
          linkedCount++;
        } else {
          console.log(`    ⚠️  Not found: ${subName}`);
        }
      }
    }

    console.log(`\n✨ Linked ${linkedCount} subcategories to parent groups\n`);

    // Step 3: Add missing subcategories
    console.log('📝 Step 3: Adding missing subcategories...');
    const newSubcats = [
      { name: 'Mason', parent: 'Manpower Services', icon: 'Hammer' },
      { name: 'Painter', parent: 'Manpower Services', icon: 'Paintbrush' },
      { name: 'Plumber', parent: 'Manpower Services', icon: 'Droplet' },
      { name: 'Carpenter', parent: 'Manpower Services', icon: 'Hammer' },
      { name: 'Welder', parent: 'Manpower Services', icon: 'Flame' },
      { name: 'Electrician', parent: 'Manpower Services', icon: 'Zap' },
      { name: 'Cleaner', parent: 'Manpower Services', icon: 'Sparkles' },
      { name: 'Laborer / Helper', parent: 'Manpower Services', icon: 'HardHat' },
    ];

    let addedCount = 0;
    for (const subcat of newSubcats) {
      // Check if exists
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('name', subcat.name)
        .single();

      if (existing) continue; // Skip if already exists

      // Find parent
      const { data: parentCat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', subcat.parent)
        .single();

      if (!parentCat) continue;

      // Insert new subcategory
      const { error } = await supabase
        .from('categories')
        .insert({
          name: subcat.name,
          icon: subcat.icon,
          parent_id: parentCat.id,
          keywords: [subcat.name.toLowerCase()],
          sort_order: 100 + addedCount
        });

      if (!error) {
        console.log(`  ✅ Added new: ${subcat.name}`);
        addedCount++;
      }
    }

    console.log(`\n✨ Added ${addedCount} new subcategories\n`);

    // Final summary
    console.log('🎉 Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Main Groups: ${mainGroupResults.length}`);
    console.log(`  - Linked Subcategories: ${linkedCount}`);
    console.log(`  - Added New Subcategories: ${addedCount}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run the script
addMainCategoryGroups()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
