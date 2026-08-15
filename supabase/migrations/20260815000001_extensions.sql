-- ============================================================
-- Capitech Bank — 0001: Extensions
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- pg_cron for scheduled jobs (interest accrual, deposit maturity)
-- Requires the pg_cron extension to be enabled in the Supabase dashboard.
create extension if not exists "pg_cron";
