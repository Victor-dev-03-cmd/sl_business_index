-- Drop existing table if it exists to ensure correct schema
DROP TABLE IF EXISTS public.categories;

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT, -- Name of the lucide-react icon
    image_url TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    keywords TEXT[],
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories Policies
CREATE POLICY "Categories viewable by all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

-- Initial seed data
INSERT INTO public.categories (name, icon, image_url, keywords, sort_order) VALUES
('Hotels & Restaurants', 'Hotel', '/icons/Hotels & Restaurants.png', ARRAY['hotel', 'stay', 'room', 'resort', 'resthouse', 'accommodation', 'villa', 'restaurant', 'dining', 'food'], 1),
('Vehicles & Automative', 'Car', '/icons/Vehicles & Automative.png', ARRAY['car', 'bike', 'garage', 'repair', 'spare parts', 'tyre', 'wash'], 2),
('Food & Dining', 'Utensils', '/icons/Food & Dining.png', ARRAY['restaurant', 'cafe', 'bakery', 'kotte', 'food', 'eat', 'dining', 'breakfast', 'lunch', 'dinner'], 3),
('Home Appliances & Services', 'Home', '/icons/Home Appliances & Services.png', ARRAY['washing machine', 'fridge', 'ac', 'tv', 'repair', 'cleaning'], 4),
('Office Equipment & Services', 'Briefcase', '/icons/Office Equipment & Services.png', ARRAY['printer', 'ink', 'paper', 'furniture', 'consultant'], 5),
('Weddings Services', 'Heart', '/icons/Weddings Services.png', ARRAY['hall', 'photo', 'dress', 'cake', 'jewelry', 'flowers'], 6),
('Professional Services', 'User', '/icons/Professional Services.png', ARRAY['lawyer', 'accountant', 'architect', 'engineer', 'it'], 7),
('Industry & Manufacturing', 'Factory', '/icons/Industry & Manufacturing.png', ARRAY['factory', 'machine', 'plastic', 'rubber', 'export'], 8),
('Repairing & Services', 'Wrench', '/icons/Repairing & Services.png', ARRAY['computer repair', 'mobile repair', 'electronic repair', 'plumbing', 'electrician'], 9),
('Arts, Entertainment & Leisure', 'Clapperboard', '/icons/Arts, Entertainment & Leisure.png', ARRAY['movie', 'club', 'park', 'gym', 'music'], 10),
('Travel & Tourism', 'Plane', '/icons/Travel & Tourism.png', ARRAY['ticket', 'visa', 'guide', 'safari', 'tour'], 11),
('Interior Design Services', 'Palette', '/icons/Interior Design Services.png', ARRAY['curtain', 'paint', 'decor', 'floor', 'kitchen'], 12),
('Health & Medical', 'Stethoscope', '/icons/Health & Medical.png', ARRAY['doctor', 'clinic', 'hospital', 'pharmacy', 'lab'], 13),
('Government & Services', 'Building', '/icons/Government & Services.png', ARRAY['office', 'council', 'police', 'post'], 14),
('Financial Services', 'Banknote', '/icons/Financial Services.png', ARRAY['finance', 'loan', 'lease', 'pawn'], 15),
('Travel & Transportation', 'Bus', '/icons/Travel & Transportation.png', ARRAY['bus', 'van', 'taxi', 'delivery', 'courier'], 16),
('Hardware Equipment', 'Hammer', '/icons/Hardware Equipment.png', ARRAY['cement', 'paint', 'tools', 'pipe', 'roof'], 17),
('Telecommunication Services', 'Phone', '/icons/Telecommunication Services.png', ARRAY['dialog', 'mobitel', 'broadband', 'sim', 'reload'], 18),
('Pet Care', 'Dog', '/icons/Pet Care.png', ARRAY['vet', 'food', 'grooming', 'bird', 'fish'], 19),
('Media & Advertising', 'Tv', '/icons/Media & Advertising.png', ARRAY['news', 'radio', 'billboard', 'print', 'video'], 20),
('Shopping & Retail', 'ShoppingCart', '/icons/Shopping & Retail.png', ARRAY['supermarket', 'mall', 'clothing', 'shoes', 'gift'], 21),
('Sports & Recreation', 'Dumbbell', '/icons/Sports & Recreation.png', ARRAY['gym', 'cricket', 'football', 'swimming', 'yoga'], 22),
('Media & Communications', 'Rss', '/icons/Media & Communications.png', ARRAY['internet', 'fiber', 'tv', 'radio'], 23),
('Agriculture Products', 'Tractor', '/icons/Agriculture Products.png', ARRAY['seed', 'fertilizer', 'agri', 'farm'], 24),
('Electronic Pheripherals', 'Laptop', '/icons/Electronic Pheripherals.png', ARRAY['mouse', 'keyboard', 'monitor', 'ssd', 'ram'], 25),
('Educational institutes & Services', 'School', '/icons/Educational institutes & Services.png', ARRAY['school', 'class', 'tuition', 'degree', 'exam'], 26),
('Baby Care', 'Baby', '/icons/Baby Care.png', ARRAY['diaper', 'milk', 'toys', 'clothes'], 27),
('Embassies & High commision', 'Building2', '/icons/Embassies & High commision.png', ARRAY['visa', 'embassy', 'passport'], 28),
('Construction Services', 'HardHat', '/icons/Construction Services.png', ARRAY['building', 'road', 'civil', 'contractor'], 29),
('Banking & Finance', 'PiggyBank', '/icons/Banking & Finance.png', ARRAY['bank', 'savings', 'credit card'], 30),
('Religious Organization', 'Landmark', '/icons/Religious Organization.png', ARRAY['temple', 'church', 'mosque', 'kovil'], 31),
('Beauty & Health', 'HeartPulse', '/icons/Beauty & Health.png', ARRAY['salon', 'makeup', 'spa', 'fitness'], 32),
('Electrical Equipment and Services', 'Plug', '/icons/Electrical Equipment and Services.png', ARRAY['wiring', 'fan', 'bulb', 'switch'], 33),
('Emergency Services', 'Siren', '/icons/Emergency Services.png', ARRAY['ambulance', 'fire', 'police'], 34),
('Insurance Services', 'Shield', '/icons/Insurance Services.png', ARRAY['life', 'medical', 'vehicle', 'policy'], 35);
