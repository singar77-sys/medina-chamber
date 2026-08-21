-- Retire the internal committee-management feature (2026-08-21).
--
-- The public "Committees & Councils" page and the admin/portal committee tooling
-- (routes, components, lib, schema) were removed, so these tables are now
-- unreferenced by the app. Drop them. committee_members references committees, so
-- drop it first (CASCADE on the child FK would also handle it; explicit is clearer).
--
-- Off-journal migration (matches 0002–0010): applied via db:migrate:all or by
-- running the DROP statements below directly in the Supabase SQL editor.

DROP TABLE IF EXISTS "committee_members";
DROP TABLE IF EXISTS "committees";
