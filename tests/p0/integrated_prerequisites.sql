-- Disposable unified P0 release rehearsal prerequisites.
\set ON_ERROR_STOP on
CREATE TABLE public.subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES auth.users(id),
 plan_name text NOT NULL,
 status text DEFAULT 'active',
 price numeric DEFAULT 0,
 billing_cycle text DEFAULT 'monthly'
);
CREATE TABLE public.invoices (
 id text PRIMARY KEY,
 subscription_id uuid REFERENCES public.subscriptions(id),
 amount numeric DEFAULT 0,
 status text DEFAULT 'paid'
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.subscriptions,public.invoices TO anon,authenticated,service_role;

-- Deliberately insecure old chat functions: P0 release must harden anon grants
-- WITHOUT removing authenticated chat access.
CREATE FUNCTION public.get_or_create_direct_room(uuid,uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT NULL::uuid
$$;
CREATE FUNCTION public.is_room_member(uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT false
$$;
