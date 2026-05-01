-- Create Business News Table
CREATE TABLE IF NOT EXISTS public.business_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    contact_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add last_news_check to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_news_check TIMESTAMPTZ DEFAULT now();

-- Enable RLS
ALTER TABLE public.business_news ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Business news viewable by everyone" ON public.business_news FOR SELECT USING (true);
CREATE POLICY "Verified owners can post news" ON public.business_news FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = business_id AND owner_id = auth.uid() AND is_verified = true
    )
);
CREATE POLICY "Owners can update/delete own news" ON public.business_news FOR ALL USING (auth.uid() = owner_id);

-- Trigger to notify all users on new business news (via a central announcement or individual notifications)
-- For "Global Notification", we'll insert into public.notifications for ALL users.
-- WARNING: This can be heavy if many users. Alternative is a "Global Announcement" system.
-- But user requested "Global Push Notification to all app users".
-- Let's implement a simplified notification trigger.

CREATE OR REPLACE FUNCTION public.notify_all_on_business_news()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    business_name TEXT;
BEGIN
    SELECT name INTO business_name FROM public.businesses WHERE id = NEW.business_id;
    
    FOR user_record IN SELECT id FROM public.profiles LOOP
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            user_record.id,
            'New Business Update: ' || business_name,
            NEW.content,
            'info'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_business_news
    AFTER INSERT ON public.business_news
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_all_on_business_news();
