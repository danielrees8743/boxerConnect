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
}
