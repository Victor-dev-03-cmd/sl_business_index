CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    role TEXT,
    image_url TEXT NOT NULL,
    quote TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_verified BOOLEAN DEFAULT true,
    type TEXT NOT NULL CHECK (type IN ('testimonial', 'image')),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Testimonials viewable by everyone" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'ceo')
    )
);

-- Grants
GRANT ALL ON public.testimonials TO authenticated;
GRANT SELECT ON public.testimonials TO anon;

-- Seed initial data
INSERT INTO public.testimonials (type, name, role, image_url, quote, rating, is_verified, display_order)
VALUES 
  ('testimonial', 'Arshad Khan', 'Owner of Jaffna Bakers', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arshad', 'SLBI helped my business reach more customers in the north. Highly recommended!', 5, true, 0),
  ('image', NULL, NULL, 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800', NULL, NULL, true, 1),
  ('testimonial', 'Sarah Perera', 'Founder of Colombo Crafts', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', 'Finding local suppliers became so much easier after joining SLBI.', 5, true, 2),
  ('image', NULL, NULL, 'https://images.unsplash.com/photo-1556740734-7f1a02931d4e?auto=format&fit=crop&q=80&w=800', NULL, NULL, true, 3),
  ('testimonial', 'Nimal Silva', 'Manager at Kandy Green Tea', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nimal', 'The verified badge added a layer of trust that our customers really value.', 5, true, 4),
  ('testimonial', 'Dinali Mendis', 'Founder of Lanka Luxe', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dinali', 'We''ve seen a 30% increase in inquiries since listing on the platform.', 5, true, 5),
  ('testimonial', 'Roshan Amarasinghe', 'CEO of Matara Tech', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roshan', 'SLBI is more than just a directory; it''s a community.', 5, true, 6),
  ('testimonial', 'Preethi Wickramasinghe', 'Owner of Kandy Kitchen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Preethi', 'As a small business, being seen is everything. SLBI gave us that visibility.', 5, true, 7);
