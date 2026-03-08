-- Fix missing columns in verifications table
ALTER TABLE public.verifications
ADD COLUMN IF NOT EXISTS br_document_url TEXT,
ADD COLUMN IF NOT EXISTS nic_passport_url TEXT;
