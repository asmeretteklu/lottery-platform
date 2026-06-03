-- To see how the policies restrict rows, we use EXPLAIN while impersonating a standard user.
-- Note: Postgres superuser (postgres role) bypasses RLS automatically. 
-- To test RLS, you must assume a regular role like 'authenticated' and mock the JWT claims.

BEGIN;

-- 1. Impersonate a logged-in user via Supabase Auth
-- This mocks auth.uid() to return the specified UUID.
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

-- Switch to the Supabase authenticated role so RLS is enforced
SET LOCAL ROLE authenticated;

-- ==========================================
-- EXPLAIN Queries to view RLS Filter plans
-- ==========================================
-- When you run these, look for the "Filter:" line in the query plan output.
-- It will show the conditions from our RLS policies merged together via OR.

-- 1. Users Table
-- Expected Filter: (id = '11111111-1111-1111-1111-111111111111'::uuid) OR (get_auth_user_role() = 'super_admin'::user_role)
EXPLAIN SELECT * FROM users;

-- 2. Lotteries Table
-- Expected Filter: (admin_id = '11111111-1111-1111-1111-111111111111'::uuid) OR (status = 'active'::lottery_status) OR (get_auth_user_role() = 'super_admin'::user_role)
EXPLAIN SELECT * FROM lotteries;

-- 3. Tickets Table
-- Expected Filter: (player_id = '11111111-1111-1111-1111-111111111111'::uuid) OR (EXISTS(SELECT 1 FROM lotteries WHERE ...)) OR (get_auth_user_role() = 'super_admin'::user_role)
EXPLAIN SELECT * FROM tickets;

-- 4. Prizes Table
-- Expected Filter: (EXISTS(SELECT 1 FROM lotteries WHERE status = 'active')) OR (EXISTS(SELECT 1 FROM lotteries WHERE admin_id = auth.uid())) OR (get_auth_user_role() = 'super_admin'::user_role)
EXPLAIN SELECT * FROM prizes;

-- 5. Draws Table
-- Expected Filter: (EXISTS(SELECT 1 FROM lotteries WHERE status = 'active')) OR (EXISTS(SELECT 1 FROM lotteries WHERE admin_id = auth.uid())) OR (get_auth_user_role() = 'super_admin'::user_role)
EXPLAIN SELECT * FROM draws;

-- 6. Audit Log Table
-- Expected Filter: (get_auth_user_role() = 'super_admin'::user_role)
EXPLAIN SELECT * FROM audit_log;

-- Revert to original state
ROLLBACK;
