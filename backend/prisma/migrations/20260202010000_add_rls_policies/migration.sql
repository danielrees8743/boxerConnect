-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR BOXERCONNECT
-- ============================================================================
-- This migration enables Row Level Security on all tables and creates
-- comprehensive access policies based on user roles (ADMIN, GYM_OWNER, COACH, BOXER)
-- 
-- User context is provided via:
--   - current_setting('app.current_user_id')::uuid - The authenticated user's ID
--   - current_setting('app.current_user_role')::text - The user's role
--
-- These settings must be set by application middleware before database operations.
--
-- SECURITY UPDATES (2026-02-02):
--   - Fixed SQL injection vulnerabilities (use parameterized queries)
--   - Fixed role escalation in users table
--   - Fixed broken signup policy
--   - Fixed token expiration checks
--   - Fixed coach match request creation abuse
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current user ID (returns NULL if not set)
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get current user role (returns NULL if not set)
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_role', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user is an admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_user_role() = 'ADMIN';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user owns a club
CREATE OR REPLACE FUNCTION owns_club(club_uuid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clubs 
    WHERE id = club_uuid 
    AND owner_id = current_user_id()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user is a coach for a specific boxer
CREATE OR REPLACE FUNCTION is_coach_of_boxer(boxer_uuid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM coach_boxer 
    WHERE boxer_id = boxer_uuid 
    AND coach_user_id = current_user_id()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user is associated with a club as a coach
CREATE OR REPLACE FUNCTION is_coach_at_club(club_uuid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM club_coaches 
    WHERE club_id = club_uuid 
    AND coach_user_id = current_user_id()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TABLE: users
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all users
CREATE POLICY "users_admin_all" ON users
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can view their own record
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (id = current_user_id());

-- SECURITY FIX: Users can update their own record but CANNOT change role or is_active
-- This prevents privilege escalation attacks where users make themselves admins
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (id = current_user_id())
  WITH CHECK (
    id = current_user_id() 
    -- Prevent role changes: role must remain the same
    AND role = (SELECT role FROM users WHERE id = current_user_id())
    -- Prevent self-deactivation bypass: is_active must remain the same
    AND is_active = (SELECT is_active FROM users WHERE id = current_user_id())
  );

-- SECURITY FIX: Only admins can change user roles and active status
-- Admins need full control to manage user permissions
CREATE POLICY "users_update_role_admin_only" ON users
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- SECURITY FIX: Allow unauthenticated signup but restrict to non-admin roles
-- During signup, current_user_id() returns NULL (user doesn't exist yet)
-- We only allow BOXER, COACH, and GYM_OWNER roles during signup
-- ADMIN accounts must be created by existing admins via withSystemContext
CREATE POLICY "users_signup" ON users
  FOR INSERT
  WITH CHECK (
    -- Only allow non-admin roles during public signup
    role IN ('BOXER', 'COACH', 'GYM_OWNER')
    -- Optional: Add additional signup restrictions
    -- AND is_active = true
    -- AND email_verified = false
  );

-- Users can delete their own record
CREATE POLICY "users_delete_own" ON users
  FOR DELETE
  USING (id = current_user_id());

-- ============================================================================
-- TABLE: boxers
-- ============================================================================

ALTER TABLE boxers ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all boxers
CREATE POLICY "boxers_admin_all" ON boxers
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- BOXER: Full access to their own profile
CREATE POLICY "boxers_boxer_own" ON boxers
  FOR ALL
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- COACH: Full access to assigned boxers
CREATE POLICY "boxers_coach_assigned" ON boxers
  FOR ALL
  USING (is_coach_of_boxer(id))
  WITH CHECK (is_coach_of_boxer(id));

-- GYM_OWNER: Read access to boxers in their clubs
CREATE POLICY "boxers_gym_owner_club" ON boxers
  FOR SELECT
  USING (
    current_user_role() = 'GYM_OWNER' 
    AND club_id IN (
      SELECT id FROM clubs WHERE owner_id = current_user_id()
    )
  );

-- GYM_OWNER: Can update boxers in their clubs
CREATE POLICY "boxers_gym_owner_update" ON boxers
  FOR UPDATE
  USING (
    current_user_role() = 'GYM_OWNER' 
    AND club_id IN (
      SELECT id FROM clubs WHERE owner_id = current_user_id()
    )
  )
  WITH CHECK (
    current_user_role() = 'GYM_OWNER' 
    AND club_id IN (
      SELECT id FROM clubs WHERE owner_id = current_user_id()
    )
  );

-- ALL AUTHENTICATED: Read public boxer profiles (searchable)
CREATE POLICY "boxers_public_read" ON boxers
  FOR SELECT
  USING (is_searchable = true AND is_verified = true);

-- ============================================================================
-- TABLE: clubs
-- ============================================================================

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all clubs
CREATE POLICY "clubs_admin_all" ON clubs
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- GYM_OWNER: Full access to owned clubs
CREATE POLICY "clubs_gym_owner_owned" ON clubs
  FOR ALL
  USING (owner_id = current_user_id())
  WITH CHECK (owner_id = current_user_id());

-- COACH: Read access to clubs they're associated with
CREATE POLICY "clubs_coach_associated" ON clubs
  FOR SELECT
  USING (
    current_user_role() = 'COACH' 
    AND id IN (
      SELECT club_id FROM club_coaches WHERE coach_user_id = current_user_id()
    )
  );

-- BOXER: Read-only access to all clubs (for searching)
CREATE POLICY "clubs_boxer_read" ON clubs
  FOR SELECT
  USING (current_user_role() = 'BOXER');

-- ALL AUTHENTICATED: Read verified clubs
CREATE POLICY "clubs_public_read" ON clubs
  FOR SELECT
  USING (is_verified = true);

-- ============================================================================
-- TABLE: fight_history
-- ============================================================================

ALTER TABLE fight_history ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all fight history
CREATE POLICY "fight_history_admin_all" ON fight_history
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- BOXER: Full access to their own fight history
CREATE POLICY "fight_history_boxer_own" ON fight_history
  FOR ALL
  USING (
    boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
  )
  WITH CHECK (
    boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
  );

-- COACH: Full access to assigned boxers' fight history
CREATE POLICY "fight_history_coach_assigned" ON fight_history
  FOR ALL
  USING (is_coach_of_boxer(boxer_id))
  WITH CHECK (is_coach_of_boxer(boxer_id));

-- GYM_OWNER: Read access to fight history of boxers in their clubs
CREATE POLICY "fight_history_gym_owner_club" ON fight_history
  FOR SELECT
  USING (
    current_user_role() = 'GYM_OWNER' 
    AND boxer_id IN (
      SELECT b.id FROM boxers b
      INNER JOIN clubs c ON b.club_id = c.id
      WHERE c.owner_id = current_user_id()
    )
  );

-- ALL AUTHENTICATED: Read fight history of public boxers
CREATE POLICY "fight_history_public_read" ON fight_history
  FOR SELECT
  USING (
    boxer_id IN (
      SELECT id FROM boxers WHERE is_searchable = true AND is_verified = true
    )
  );

-- ============================================================================
-- TABLE: availability
-- ============================================================================

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all availability
CREATE POLICY "availability_admin_all" ON availability
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- BOXER: Full access to their own availability
CREATE POLICY "availability_boxer_own" ON availability
  FOR ALL
  USING (
    boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
  )
  WITH CHECK (
    boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
  );

-- COACH: Full access to assigned boxers' availability
CREATE POLICY "availability_coach_assigned" ON availability
  FOR ALL
  USING (is_coach_of_boxer(boxer_id))
  WITH CHECK (is_coach_of_boxer(boxer_id));

-- GYM_OWNER: Read access to availability of boxers in their clubs
CREATE POLICY "availability_gym_owner_club" ON availability
  FOR SELECT
  USING (
    current_user_role() = 'GYM_OWNER' 
    AND boxer_id IN (
      SELECT b.id FROM boxers b
      INNER JOIN clubs c ON b.club_id = c.id
      WHERE c.owner_id = current_user_id()
    )
  );

-- ALL AUTHENTICATED: Read availability of public boxers (for match making)
CREATE POLICY "availability_public_read" ON availability
  FOR SELECT
  USING (
    is_available = true 
    AND boxer_id IN (
      SELECT id FROM boxers WHERE is_searchable = true AND is_verified = true
    )
  );

-- ============================================================================
-- TABLE: match_requests
-- ============================================================================

ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all match requests
CREATE POLICY "match_requests_admin_all" ON match_requests
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- BOXER: Full access to match requests they're involved in (requester or target)
CREATE POLICY "match_requests_boxer_involved" ON match_requests
  FOR ALL
  USING (
    requester_boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
    OR target_boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
  )
  WITH CHECK (
    requester_boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
    OR target_boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
  );

-- SECURITY FIX: Split coach policy to prevent abuse
-- Coaches can view requests involving their boxers
CREATE POLICY "match_requests_coach_view" ON match_requests
  FOR SELECT
  USING (
    is_coach_of_boxer(requester_boxer_id) 
    OR is_coach_of_boxer(target_boxer_id)
  );

-- SECURITY FIX: Coaches can only create requests FROM their assigned boxers
-- This prevents coaches from creating fraudulent requests TO their boxer from any other boxer
CREATE POLICY "match_requests_coach_create" ON match_requests
  FOR INSERT
  WITH CHECK (is_coach_of_boxer(requester_boxer_id));

-- Coaches can update requests involving their boxers
CREATE POLICY "match_requests_coach_update" ON match_requests
  FOR UPDATE
  USING (
    is_coach_of_boxer(requester_boxer_id) 
    OR is_coach_of_boxer(target_boxer_id)
  )
  WITH CHECK (
    is_coach_of_boxer(requester_boxer_id) 
    OR is_coach_of_boxer(target_boxer_id)
  );

-- Coaches can delete requests involving their boxers
CREATE POLICY "match_requests_coach_delete" ON match_requests
  FOR DELETE
  USING (
    is_coach_of_boxer(requester_boxer_id) 
    OR is_coach_of_boxer(target_boxer_id)
  );

-- GYM_OWNER: Read access to match requests involving boxers in their clubs
CREATE POLICY "match_requests_gym_owner_club" ON match_requests
  FOR SELECT
  USING (
    current_user_role() = 'GYM_OWNER' 
    AND (
      requester_boxer_id IN (
        SELECT b.id FROM boxers b
        INNER JOIN clubs c ON b.club_id = c.id
        WHERE c.owner_id = current_user_id()
      )
      OR target_boxer_id IN (
        SELECT b.id FROM boxers b
        INNER JOIN clubs c ON b.club_id = c.id
        WHERE c.owner_id = current_user_id()
      )
    )
  );

-- ============================================================================
-- TABLE: coach_boxer
-- ============================================================================

ALTER TABLE coach_boxer ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all coach-boxer relationships
CREATE POLICY "coach_boxer_admin_all" ON coach_boxer
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- COACH: Full access to their own coach-boxer relationships
CREATE POLICY "coach_boxer_coach_own" ON coach_boxer
  FOR ALL
  USING (coach_user_id = current_user_id())
  WITH CHECK (coach_user_id = current_user_id());

-- BOXER: Can view coaches assigned to them
CREATE POLICY "coach_boxer_boxer_view" ON coach_boxer
  FOR SELECT
  USING (
    boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
  );

-- BOXER: Can delete coach assignments (remove coaches)
CREATE POLICY "coach_boxer_boxer_delete" ON coach_boxer
  FOR DELETE
  USING (
    boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
  );

-- GYM_OWNER: Full access to coach-boxer relationships for their clubs
CREATE POLICY "coach_boxer_gym_owner_club" ON coach_boxer
  FOR ALL
  USING (
    current_user_role() = 'GYM_OWNER' 
    AND boxer_id IN (
      SELECT b.id FROM boxers b
      INNER JOIN clubs c ON b.club_id = c.id
      WHERE c.owner_id = current_user_id()
    )
  )
  WITH CHECK (
    current_user_role() = 'GYM_OWNER' 
    AND boxer_id IN (
      SELECT b.id FROM boxers b
      INNER JOIN clubs c ON b.club_id = c.id
      WHERE c.owner_id = current_user_id()
    )
  );

-- ============================================================================
-- TABLE: club_coaches
-- ============================================================================

ALTER TABLE club_coaches ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all club coaches
CREATE POLICY "club_coaches_admin_all" ON club_coaches
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- GYM_OWNER: Full access to coaches in their clubs
CREATE POLICY "club_coaches_gym_owner_club" ON club_coaches
  FOR ALL
  USING (owns_club(club_id))
  WITH CHECK (owns_club(club_id));

-- COACH: Can view their own club associations
CREATE POLICY "club_coaches_coach_own" ON club_coaches
  FOR SELECT
  USING (coach_user_id = current_user_id());

-- BOXER: Can view coaches at clubs (for finding coaches)
CREATE POLICY "club_coaches_boxer_read" ON club_coaches
  FOR SELECT
  USING (current_user_role() = 'BOXER');

-- ALL AUTHENTICATED: Read coaches at verified clubs
CREATE POLICY "club_coaches_public_read" ON club_coaches
  FOR SELECT
  USING (
    club_id IN (
      SELECT id FROM clubs WHERE is_verified = true
    )
  );

-- ============================================================================
-- TABLE: boxer_videos
-- ============================================================================

ALTER TABLE boxer_videos ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all videos
CREATE POLICY "boxer_videos_admin_all" ON boxer_videos
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- BOXER: Full access to their own videos
CREATE POLICY "boxer_videos_boxer_own" ON boxer_videos
  FOR ALL
  USING (
    boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
  )
  WITH CHECK (
    boxer_id IN (
      SELECT id FROM boxers WHERE user_id = current_user_id()
    )
  );

-- COACH: Full access to assigned boxers' videos
CREATE POLICY "boxer_videos_coach_assigned" ON boxer_videos
  FOR ALL
  USING (is_coach_of_boxer(boxer_id))
  WITH CHECK (is_coach_of_boxer(boxer_id));

-- GYM_OWNER: Read access to videos of boxers in their clubs
CREATE POLICY "boxer_videos_gym_owner_club" ON boxer_videos
  FOR SELECT
  USING (
    current_user_role() = 'GYM_OWNER' 
    AND boxer_id IN (
      SELECT b.id FROM boxers b
      INNER JOIN clubs c ON b.club_id = c.id
      WHERE c.owner_id = current_user_id()
    )
  );

-- ALL AUTHENTICATED: Read videos of public boxers
CREATE POLICY "boxer_videos_public_read" ON boxer_videos
  FOR SELECT
  USING (
    boxer_id IN (
      SELECT id FROM boxers WHERE is_searchable = true AND is_verified = true
    )
  );

-- ============================================================================
-- TABLE: refresh_tokens
-- ============================================================================

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all tokens
CREATE POLICY "refresh_tokens_admin_all" ON refresh_tokens
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- SECURITY FIX: Add token expiration validation
-- Users can only access their own non-expired refresh tokens
CREATE POLICY "refresh_tokens_own" ON refresh_tokens
  FOR ALL
  USING (
    user_id = current_user_id() 
    AND expires_at > NOW()
  )
  WITH CHECK (
    user_id = current_user_id()
    AND expires_at > NOW()
  );

-- ============================================================================
-- TABLE: password_reset_tokens
-- ============================================================================

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full access to all tokens
CREATE POLICY "password_reset_tokens_admin_all" ON password_reset_tokens
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- SECURITY FIX: Users can only read their own non-expired, unused tokens
-- Prevents replay attacks and token enumeration
CREATE POLICY "password_reset_tokens_own_read" ON password_reset_tokens
  FOR SELECT
  USING (
    user_id = current_user_id() 
    AND expires_at > NOW()
    AND used_at IS NULL
  );

-- SECURITY FIX: Prevent users from modifying reset tokens
-- Application logic handles marking tokens as used via withSystemContext
-- This prevents users from resetting the 'used_at' field to reuse tokens
CREATE POLICY "password_reset_tokens_no_user_modify" ON password_reset_tokens
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "password_reset_tokens_no_user_delete" ON password_reset_tokens
  FOR DELETE
  USING (false);

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================

COMMENT ON FUNCTION current_user_id() IS 'Returns the current authenticated user ID from app.current_user_id setting';
COMMENT ON FUNCTION current_user_role() IS 'Returns the current authenticated user role from app.current_user_role setting';
COMMENT ON FUNCTION is_admin() IS 'Check if current user has ADMIN role';
COMMENT ON FUNCTION owns_club(UUID) IS 'Check if current user owns the specified club';
COMMENT ON FUNCTION is_coach_of_boxer(UUID) IS 'Check if current user is a coach for the specified boxer';
COMMENT ON FUNCTION is_coach_at_club(UUID) IS 'Check if current user is a coach at the specified club';

-- ============================================================================
-- SECURITY AUDIT LOG
-- ============================================================================
-- 2026-02-02: Applied critical security fixes
--   1. Fixed SQL injection in database-context.ts (use $executeRaw)
--   2. Fixed role escalation in users table (prevent role/is_active changes)
--   3. Fixed broken signup policy (allow non-admin role signups)
--   4. Fixed token expiration validation (refresh_tokens, password_reset_tokens)
--   5. Fixed coach match request creation abuse (split policies)
--   6. Deprecated unsafe middleware and context functions
--   7. Added audit logging to system context usage
-- ============================================================================
