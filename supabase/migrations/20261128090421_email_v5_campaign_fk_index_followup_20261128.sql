create index if not exists email_draft_business_fk_idx
  on public.marketing_email_campaign_drafts(business_id);
create index if not exists email_draft_history_business_fk_idx
  on public.marketing_email_campaign_draft_history(business_id);
