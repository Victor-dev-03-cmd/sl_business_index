-- Allow everyone to view buckets (needed for storage client to find them)
DO $$
BEGIN
    -- Check if RLS is enabled on storage.buckets, if not, we don't need a policy (or we can't add one)
    -- But usually it is enabled.

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'buckets'
        AND policyname = 'Public Access to Buckets'
    ) THEN
        BEGIN
            CREATE POLICY "Public Access to Buckets" ON storage.buckets FOR SELECT USING (true);
        EXCEPTION WHEN OTHERS THEN
            -- If we can't create the policy (e.g. permissions), we ignore it.
            -- The user might need to run this as superuser.
            RAISE NOTICE 'Could not create policy on storage.buckets: %', SQLERRM;
        END;
    END IF;
END $$;
