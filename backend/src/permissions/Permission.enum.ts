// Permission Enum
// Defines all granular permissions for role-based access control
// Permission format: resource:action:scope

export enum Permission {
  // ============================================================================
  // Boxer Operations
  // ============================================================================

  /** Create a new boxer profile */
  BOXER_CREATE_PROFILE = 'boxer:create:profile',

  /** Read own boxer profile */
  BOXER_READ_OWN_PROFILE = 'boxer:read:own',

  /** Read any boxer profile (public or linked) */
  BOXER_READ_ANY_PROFILE = 'boxer:read:any',

  /** Update own boxer profile */
  BOXER_UPDATE_OWN_PROFILE = 'boxer:update:own',

  /** Update a linked boxer's profile (for coaches with permission) */
  BOXER_UPDATE_LINKED_PROFILE = 'boxer:update:linked',

  /** Delete own boxer profile */
  BOXER_DELETE_OWN_PROFILE = 'boxer:delete:own',

  /** Upload photos to boxer profile */
  BOXER_UPLOAD_PHOTO = 'boxer:upload:photo',

  /** Upload videos to boxer profile */
  BOXER_UPLOAD_VIDEO = 'boxer:upload:video',

  // ============================================================================
  // Fight History Operations
  // ============================================================================

  /** Create a fight history entry */
  FIGHT_CREATE = 'fight:create',

  /** Read fight history entries */
  FIGHT_READ = 'fight:read',

  /** Update a fight history entry */
  FIGHT_UPDATE = 'fight:update',

  /** Delete a fight history entry */
  FIGHT_DELETE = 'fight:delete',

  /** Manage a linked boxer's fight history (coach/gym owner) */
  FIGHT_MANAGE_LINKED = 'fight:manage:linked',

  // ============================================================================
  // Match Request Operations
  // ============================================================================

  /** Create a new match request */
  MATCH_CREATE_REQUEST = 'match:create:request',

  /** Read own match requests (sent or received) */
  MATCH_READ_OWN_REQUESTS = 'match:read:own',

  /** Accept an incoming match request */
  MATCH_ACCEPT_REQUEST = 'match:accept',

  /** Decline an incoming match request */
  MATCH_DECLINE_REQUEST = 'match:decline',

  /** Cancel an outgoing match request */
  MATCH_CANCEL_REQUEST = 'match:cancel',

  // ============================================================================
  // Availability Operations
  // ============================================================================

  /** Create availability entries */
  AVAILABILITY_CREATE = 'availability:create',

  /** Read availability entries */
  AVAILABILITY_READ = 'availability:read',

  /** Update availability entries */
  AVAILABILITY_UPDATE = 'availability:update',

  /** Delete availability entries */
  AVAILABILITY_DELETE = 'availability:delete',

  // ============================================================================
  // Club Operations
  // ============================================================================

  /** Read public club information */
  CLUB_READ_PUBLIC = 'club:read:public',

  /** Read club member list */
  CLUB_READ_MEMBERS = 'club:read:members',

  /** Add a boxer to a club */
  CLUB_MEMBER_ADD_BOXER = 'club:member:add:boxer',

  /** Remove a boxer from a club */
  CLUB_MEMBER_REMOVE_BOXER = 'club:member:remove:boxer',

  /** Add a coach to a club */
  CLUB_MEMBER_ADD_COACH = 'club:member:add:coach',

  /** Remove a coach from a club */
  CLUB_MEMBER_REMOVE_COACH = 'club:member:remove:coach',

  /** Set or transfer club ownership */
  CLUB_SET_OWNER = 'club:set:owner',

  // ============================================================================
  // Coach Operations
  // ============================================================================

  /** Link a boxer to a coach relationship */
  COACH_LINK_BOXER = 'coach:link:boxer',

  /** Unlink a boxer from a coach relationship */
  COACH_UNLINK_BOXER = 'coach:unlink:boxer',

  /** Update permissions for a coach-boxer relationship */
  COACH_UPDATE_BOXER_PERMISSIONS = 'coach:update:boxer:permissions',

  // ============================================================================
  // Admin Operations
  // ============================================================================

  /** Read all users in the system */
  ADMIN_READ_ALL_USERS = 'admin:read:users',

  /** Update user account status (suspend, activate, etc.) */
  ADMIN_UPDATE_USER_STATUS = 'admin:update:user:status',

  /** Verify a boxer's identity/credentials */
  ADMIN_VERIFY_BOXER = 'admin:verify:boxer',

  /** Read system statistics and metrics */
  ADMIN_READ_SYSTEM_STATS = 'admin:read:stats',

  /** Create a new user */
  ADMIN_CREATE_USER = 'admin:create:user',

  /** Update user details (name, email, role) */
  ADMIN_UPDATE_USER = 'admin:update:user',

  /** Delete a user (soft delete) */
  ADMIN_DELETE_USER = 'admin:delete:user',

  /** Create a boxer profile for any user */
  ADMIN_CREATE_BOXER = 'admin:create:boxer',

  /** Update any boxer profile */
  ADMIN_UPDATE_BOXER = 'admin:update:boxer',

  /** Delete any boxer profile */
  ADMIN_DELETE_BOXER = 'admin:delete:boxer',

  /** Create a new club */
  ADMIN_CREATE_CLUB = 'admin:create:club',

  /** Update any club details */
  ADMIN_UPDATE_CLUB = 'admin:update:club',

  /** Delete a club */
  ADMIN_DELETE_CLUB = 'admin:delete:club',
}
