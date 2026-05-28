-- Add 8 main category groups as parent categories
-- These will serve as the top-level navigation categories

-- First, insert the 8 main category groups
INSERT INTO public.categories (name, icon, parent_id, keywords, sort_order) VALUES
('Manpower Services', 'Users', NULL, ARRAY['labor', 'workers', 'manpower', 'skilled', 'construction workers'], 1),
('Care & Lifestyle', 'HeartPulse', NULL, ARRAY['health', 'beauty', 'care', 'wellness', 'lifestyle'], 2),
('Professional & Finance', 'Briefcase', NULL, ARRAY['professional', 'finance', 'banking', 'legal', 'consulting'], 3),
('Construction & Industrial', 'HardHat', NULL, ARRAY['construction', 'building', 'industrial', 'manufacturing', 'hardware'], 4),
('Technical & Electronics', 'Cpu', NULL, ARRAY['electronics', 'computers', 'technical', 'IT', 'electrical'], 5),
('Events, Food & Leisure', 'PartyPopper', NULL, ARRAY['events', 'food', 'dining', 'entertainment', 'weddings'], 6),
('Travel & Transport', 'Plane', NULL, ARRAY['travel', 'transport', 'tourism', 'vehicles', 'automotive'], 7),
('Retail & Others', 'ShoppingCart', NULL, ARRAY['retail', 'shopping', 'agriculture', 'education', 'home'], 8)
ON CONFLICT (name) DO NOTHING;

-- Now link existing categories to their parent groups
-- Note: We need to get the UUIDs of the newly created parent categories

DO $$
DECLARE
  manpower_id UUID;
  care_lifestyle_id UUID;
  professional_finance_id UUID;
  construction_industrial_id UUID;
  technical_electronics_id UUID;
  events_food_leisure_id UUID;
  travel_transport_id UUID;
  retail_others_id UUID;
BEGIN
  -- Get parent category IDs
  SELECT id INTO manpower_id FROM categories WHERE name = 'Manpower Services';
  SELECT id INTO care_lifestyle_id FROM categories WHERE name = 'Care & Lifestyle';
  SELECT id INTO professional_finance_id FROM categories WHERE name = 'Professional & Finance';
  SELECT id INTO construction_industrial_id FROM categories WHERE name = 'Construction & Industrial';
  SELECT id INTO technical_electronics_id FROM categories WHERE name = 'Technical & Electronics';
  SELECT id INTO events_food_leisure_id FROM categories WHERE name = 'Events, Food & Leisure';
  SELECT id INTO travel_transport_id FROM categories WHERE name = 'Travel & Transport';
  SELECT id INTO retail_others_id FROM categories WHERE name = 'Retail & Others';

  -- Manpower Services subcategories
  UPDATE categories SET parent_id = manpower_id WHERE name IN (
    'Mason', 'Painter', 'Plumber', 'Carpenter', 'Welder', 'Electrician', 'Cleaner', 'Laborer / Helper'
  );

  -- Care & Lifestyle subcategories
  UPDATE categories SET parent_id = care_lifestyle_id WHERE name IN (
    'Health & Medical', 'Baby Care', 'Pet Care', 'Beauty & Health', 'Religious Organization'
  );

  -- Professional & Finance subcategories
  UPDATE categories SET parent_id = professional_finance_id WHERE name IN (
    'Banking & Finance', 'Insurance Services', 'Financial Services',
    'Legal, Government & Services', 'Media & Advertising', 'Professional Services'
  );

  -- Construction & Industrial subcategories
  UPDATE categories SET parent_id = construction_industrial_id WHERE name IN (
    'Construction Services', 'Hardware Equipment', 'Industry & Manufacturing',
    'Interior Design Services', 'Office Equipment & Services'
  );

  -- Technical & Electronics subcategories
  UPDATE categories SET parent_id = technical_electronics_id WHERE name IN (
    'Electronic Pheripherals', 'Electrical Equipment and Services',
    'Repairing & Services', 'Media & Communications'
  );

  -- Events, Food & Leisure subcategories
  UPDATE categories SET parent_id = events_food_leisure_id WHERE name IN (
    'Event Planner', 'Weddings Services', 'Food & Dining',
    'Arts, Entertainment & Leisure', 'Hotels & Restaurants'
  );

  -- Travel & Transport subcategories
  UPDATE categories SET parent_id = travel_transport_id WHERE name IN (
    'Travel & Tourism', 'Travel & Transportation', 'Vehicles & Automative',
    'Telecommunication Services'
  );

  -- Retail & Others subcategories
  UPDATE categories SET parent_id = retail_others_id WHERE name IN (
    'Shopping & Retail', 'Agriculture Products', 'Sports & Recreation',
    'Home Appliances & Services', 'Educational institutes & Services'
  );

  -- Add subcategories that might not exist yet
  -- Manpower Services additional
  INSERT INTO categories (name, parent_id, icon, sort_order) VALUES
  ('Mason', manpower_id, 'Hammer', 100),
  ('Painter', manpower_id, 'Paintbrush', 101),
  ('Plumber', manpower_id, 'Droplet', 102),
  ('Carpenter', manpower_id, 'Hammer', 103),
  ('Welder', manpower_id, 'Flame', 104),
  ('Electrician', manpower_id, 'Zap', 105),
  ('Cleaner', manpower_id, 'Sparkles', 106),
  ('Laborer / Helper', manpower_id, 'HardHat', 107)
  ON CONFLICT (name) DO NOTHING;

  -- Events additional
  INSERT INTO categories (name, parent_id, icon, sort_order) VALUES
  ('Event Planner', events_food_leisure_id, 'Calendar', 200)
  ON CONFLICT (name) DO NOTHING;

  -- Professional additional
  INSERT INTO categories (name, parent_id, icon, sort_order) VALUES
  ('Legal, Government & Services', professional_finance_id, 'Scale', 300)
  ON CONFLICT (name) DO NOTHING;

END $$;
