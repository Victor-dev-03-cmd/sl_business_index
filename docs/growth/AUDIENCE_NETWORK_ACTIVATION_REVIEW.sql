-- Apply only with exact tested foundation, approved release and migration record.
-- pg_cron is already installed in SLBI production; existing FCM dispatch is unchanged.
SELECT cron.schedule('slbi-audience-news-batch','* * * * *','SELECT slbi_audience_private.process_news_batch();');
