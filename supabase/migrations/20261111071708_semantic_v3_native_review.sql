-- SLBI v3 admin-only native-speaker intent validation.
ALTER TABLE public.search_evaluation_cases
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
GRANT UPDATE (validation_status,validated_by,validated_at)
ON public.search_evaluation_cases TO authenticated;
CREATE POLICY "admin_validate_search_eval_case"
ON public.search_evaluation_cases FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND lower(p.role::text) IN ('admin','ceo'))
)
WITH CHECK (
  validated_by=(SELECT auth.uid())
  AND validated_at IS NOT NULL
  AND validation_status IN ('reviewed','rejected')
  AND EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND lower(p.role::text) IN ('admin','ceo'))
);
