# Gym Owner Boxer Management Feature

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [Flow A: Direct Account Creation](#flow-a-direct-account-creation)
3. [Flow B: Self-Signup with Verification](#flow-b-self-signup-with-verification)
4. [Database Schema](#database-schema)
5. [Permissions](#permissions)
6. [Security Considerations](#security-considerations)
7. [Testing](#testing)
8. [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)

---

## Feature Overview

The **Gym Owner Boxer Management** feature provides two distinct workflows for onboarding boxers to clubs within BoxerConnect:

### Flow A: Direct Account Creation
Gym owners can directly create boxer accounts that are immediately linked to their clubs. This streamlined approach is ideal for:
- In-person registrations at the gym
- Bulk account creation for existing gym members
- Scenarios where immediate access is required
- Traditional gym management workflows

### Flow B: Self-Signup with Approval
Boxers can self-register and request membership to a specific club, pending gym owner approval. This approach supports:
- Online registrations where boxers discover clubs
- Controlled membership growth with verification
- Remote onboarding workflows
- Quality control for club membership

### User Roles Involved

| Role | Description | Responsibilities |
|------|-------------|------------------|
| **GYM_OWNER** | Club manager/owner | Create boxer accounts, approve/reject membership requests, manage club members |
| **BOXER** | Fighter | Self-register, request club membership, view own profile and match requests |
| **ADMIN** | System administrator | Full access to all features, can override any restrictions |
| **COACH** | Trainer | Manage linked boxers' profiles, matches, and availability |

### Benefits

- **Flexibility**: Two workflows accommodate different onboarding scenarios
- **Control**: Gym owners maintain authority over club membership
- **Accessibility**: Boxers can discover and request membership independently
- **Security**: Row-Level Security (RLS) ensures proper data isolation
- **Auditability**: All membership changes are tracked with timestamps and reviewer information

---

## Flow A: Direct Account Creation

### Overview
Gym owners create boxer accounts directly through their dashboard. The accounts are immediately linked to the gym owner's club, and boxers can log in immediately with their credentials.

### Step-by-Step User Flow

1. **Gym Owner Navigates to Account Creation**
   - Accesses gym owner dashboard
   - Selects "Create Boxer Account" option
   - Chooses which club to add the boxer to (if owner has multiple clubs)

2. **Gym Owner Fills Account Details**
   - **Required fields:**
     - Email address
     - Password (minimum 8 characters, must contain uppercase, lowercase, and number)
     - Boxer's full name
   - **Optional fields:**
     - Experience level (BEGINNER, AMATEUR, INTERMEDIATE, ADVANCED, PROFESSIONAL)
     - Gender (MALE, FEMALE)
     - Weight (in kg, between 40-200 kg)
     - Height (in cm, between 120-230 cm)
     - Date of birth
     - City
     - Country

3. **System Validation**
   - Verifies gym owner owns the specified club
   - Checks email is not already registered
   - Validates password meets security requirements
   - Confirms all required fields are present

4. **Account Creation**
   - User account created with BOXER role
   - Boxer profile created and linked to user
   - Profile automatically linked to gym owner's club
   - `gymAffiliation` field set to club name
   - Account is immediately active

5. **Post-Creation**
   - Boxer can log in immediately using provided credentials
   - Profile appears in gym owner's club member list
   - Boxer has full access to their profile

### API Endpoint Documentation

#### Create Boxer Account

**Endpoint:** `POST /api/v1/gym-owner/clubs/:clubId/boxers/create-account`

**Authentication:** Required (GYM_OWNER role)

**Permission:** `GYM_OWNER_CREATE_BOXER_ACCOUNT`

**Rate Limiting:** Yes (5 requests per minute)

**Path Parameters:**
- `clubId` (UUID, required) - The ID of the club to add the boxer to

**Request Body:**
```json
{
  "email": "boxer@example.com",
  "password": "SecurePass123",
  "name": "John Smith",
  "experienceLevel": "BEGINNER",
  "gender": "MALE",
  "weightKg": 75.5,
  "heightCm": 180,
  "dateOfBirth": "1995-06-15",
  "city": "London",
  "country": "United Kingdom"
}
```

**Validation Rules:**
- `email`: Valid email format, max 255 characters, lowercase
- `password`: 8-128 characters, must contain at least one uppercase letter, one lowercase letter, and one number
- `name`: 2-100 characters
- `experienceLevel`: One of: BEGINNER, AMATEUR, INTERMEDIATE, ADVANCED, PROFESSIONAL
- `gender`: One of: MALE, FEMALE
- `weightKg`: 40-200
- `heightCm`: 120-230 (integer)
- `dateOfBirth`: Valid date in the past (ISO 8601 format)
- `city`: Max 100 characters
- `country`: Max 100 characters

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "boxer@example.com",
      "name": "John Smith",
      "role": "BOXER",
      "isActive": true,
      "emailVerified": false,
      "createdAt": "2024-02-02T10:30:00.000Z",
      "updatedAt": "2024-02-02T10:30:00.000Z"
    },
    "boxer": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Smith",
      "experienceLevel": "BEGINNER",
      "gender": "MALE",
      "weightKg": "75.50",
      "heightCm": 180,
      "dateOfBirth": "1995-06-15T00:00:00.000Z",
      "city": "London",
      "country": "United Kingdom",
      "clubId": "770e8400-e29b-41d4-a716-446655440002",
      "gymAffiliation": "Elite Boxing Club",
      "createdAt": "2024-02-02T10:30:00.000Z",
      "updatedAt": "2024-02-02T10:30:00.000Z"
    }
  },
  "message": "Boxer account created successfully"
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Bad Request | Missing club ID, invalid email format, validation errors |
| 400 | User with this email already exists | Email address is already registered |
| 400 | Club not found | The specified club does not exist |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Not authorized to create accounts for this club (user is not the club owner) |
| 429 | Too Many Requests | Rate limit exceeded |

### Frontend Components Involved

**Components:**
- `GymOwnerDashboard`: Main dashboard with "Create Account" button
- `CreateBoxerAccountForm`: Form for entering boxer details
- `ClubSelector`: Dropdown to select club (if owner has multiple clubs)
- `BoxerProfilePreview`: Preview of created profile
- `SuccessNotification`: Confirmation message with login credentials

**State Management:**
- Fetches owned clubs on component mount
- Validates form fields in real-time
- Handles submission and error states
- Displays success message with boxer credentials
- Redirects to club member list after creation

### UI Flow Description

1. **Dashboard View**
   - Display "Create Boxer Account" button in prominent location
   - Show list of owned clubs with member counts

2. **Account Creation Form**
   - Multi-step form with progress indicator
   - Step 1: Select club (if multiple)
   - Step 2: Enter account credentials (email, password)
   - Step 3: Enter boxer details (name, experience level, physical stats)
   - Step 4: Review and confirm
   - Real-time validation feedback
   - Password strength indicator

3. **Success State**
   - Display confirmation message
   - Show created boxer's details
   - Provide option to:
     - Create another account
     - View club member list
     - Copy credentials to share with boxer

4. **Error Handling**
   - Display inline validation errors
   - Show toast notification for duplicate email
   - Provide guidance on fixing errors
   - Maintain form state on error

---

## Flow B: Self-Signup with Verification

### Overview
Boxers self-register through the public registration flow and select a club they wish to join. A membership request is created and sent to the gym owner for review. Upon approval, the boxer's profile is linked to the club.

### Step-by-Step User Flow

#### Boxer Registration

1. **Boxer Navigates to Registration**
   - Accesses public registration page
   - Selects "Sign Up as Boxer" option

2. **Boxer Enters Account Details**
   - **Required fields:**
     - Email address
     - Password (minimum 8 characters, must contain uppercase, lowercase, and number)
     - Full name
   - **Optional:**
     - Select a club to join (searchable dropdown)

3. **System Processing**
   - User account created with BOXER role
   - Boxer profile created (not yet linked to club)
   - If `clubId` provided: Membership request created with PENDING status
   - Account is active and boxer can log in immediately

4. **Boxer Confirmation**
   - Receives confirmation email (optional feature)
   - Can log in and access profile
   - If membership request created: See "Pending approval" status

#### Gym Owner Review

1. **Gym Owner Dashboard Notification**
   - Badge showing count of pending membership requests
   - "Membership Requests" menu item

2. **Gym Owner Reviews Requests**
   - List view of all pending requests showing:
     - Boxer's name
     - Email address
     - Request date
     - View profile button
   - Sorted by request date (newest first)

3. **Gym Owner Decision**
   - **Option A: Approve**
     - Clicks "Approve" button
     - Confirms approval action
     - Boxer immediately linked to club
   - **Option B: Reject**
     - Clicks "Reject" button
     - Optionally enters rejection notes
     - Confirms rejection

4. **Post-Decision**
   - Request moved to "Processed" list
   - Boxer's profile updated (if approved)
   - System tracks reviewer and timestamp

#### Boxer Status Check

1. **Approved**
   - Boxer sees club name in profile
   - Can view club information and members
   - Full club member benefits

2. **Rejected**
   - Boxer sees no club affiliation
   - Can submit new request to different club
   - Can view rejection notes (if provided)

3. **Pending**
   - Boxer sees "Pending approval" status
   - Can view which club they applied to
   - Can cancel request if desired

### API Endpoint Documentation

#### Boxer: Request Club Membership

**Note:** Membership requests are typically created during registration. If a boxer registers with a `clubId` in the payload, the membership request is automatically created.

**Registration Endpoint:** `POST /api/v1/auth/register`

**Authentication:** Not required (public endpoint)

**Request Body:**
```json
{
  "email": "boxer@example.com",
  "password": "SecurePass123",
  "name": "Jane Doe",
  "role": "BOXER",
  "clubId": "770e8400-e29b-41d4-a716-446655440002"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "boxer@example.com",
      "name": "Jane Doe",
      "role": "BOXER",
      "isActive": true,
      "emailVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Registration successful"
}
```

**Note:** If registration succeeds but membership request creation fails, the registration still completes successfully. The error is logged but not returned to the user.

#### Gym Owner: Get Pending Requests

**Endpoint:** `GET /api/v1/gym-owner/membership-requests`

**Authentication:** Required (GYM_OWNER role)

**Permission:** `GYM_OWNER_VIEW_MEMBERSHIP_REQUESTS`

**Query Parameters:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "clubId": "770e8400-e29b-41d4-a716-446655440002",
        "status": "PENDING",
        "requestedAt": "2024-02-01T15:30:00.000Z",
        "reviewedAt": null,
        "reviewedBy": null,
        "notes": null,
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "email": "boxer@example.com",
          "name": "Jane Doe"
        },
        "club": {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "name": "Elite Boxing Club"
        }
      }
    ]
  },
  "message": "Pending membership requests retrieved successfully"
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User does not have GYM_OWNER_VIEW_MEMBERSHIP_REQUESTS permission |

#### Gym Owner: Approve Request

**Endpoint:** `POST /api/v1/gym-owner/membership-requests/:id/approve`

**Authentication:** Required (GYM_OWNER role)

**Permission:** `GYM_OWNER_APPROVE_MEMBERSHIP`

**Rate Limiting:** Yes (10 requests per minute)

**Path Parameters:**
- `id` (UUID, required) - The membership request ID

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "boxer": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Jane Doe",
      "clubId": "770e8400-e29b-41d4-a716-446655440002",
      "gymAffiliation": "Elite Boxing Club",
      "experienceLevel": "BEGINNER",
      "createdAt": "2024-02-01T15:30:00.000Z",
      "updatedAt": "2024-02-02T11:00:00.000Z"
    }
  },
  "message": "Membership request approved successfully"
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Bad Request | Missing request ID |
| 400 | User does not have a boxer profile | The user associated with the request doesn't have a boxer profile (should not occur) |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Not authorized to approve requests for this club (not the club owner) |
| 403 | Request has already been processed | Request was already approved or rejected |
| 404 | Not Found | Membership request not found |
| 429 | Too Many Requests | Rate limit exceeded |

#### Gym Owner: Reject Request

**Endpoint:** `POST /api/v1/gym-owner/membership-requests/:id/reject`

**Authentication:** Required (GYM_OWNER role)

**Permission:** `GYM_OWNER_REJECT_MEMBERSHIP`

**Rate Limiting:** Yes (10 requests per minute)

**Path Parameters:**
- `id` (UUID, required) - The membership request ID

**Request Body:**
```json
{
  "notes": "Not accepting new members at this time. Please reapply in 3 months."
}
```

**Validation Rules:**
- `notes` (optional): Max 1000 characters

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "request": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "clubId": "770e8400-e29b-41d4-a716-446655440002",
      "status": "REJECTED",
      "requestedAt": "2024-02-01T15:30:00.000Z",
      "reviewedAt": "2024-02-02T11:15:00.000Z",
      "reviewedBy": "990e8400-e29b-41d4-a716-446655440004",
      "notes": "Not accepting new members at this time. Please reapply in 3 months."
    }
  },
  "message": "Membership request rejected successfully"
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Bad Request | Missing request ID or validation error on notes field |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Not authorized to reject requests for this club (not the club owner) |
| 403 | Request has already been processed | Request was already approved or rejected |
| 404 | Not Found | Membership request not found |
| 429 | Too Many Requests | Rate limit exceeded |

### Frontend Components Involved

**Boxer Components:**
- `RegistrationForm`: Multi-step registration with club selection
- `ClubSearch`: Searchable dropdown for selecting club
- `MembershipStatusBadge`: Shows pending/approved/rejected status
- `MembershipRequestDetails`: View request status and details

**Gym Owner Components:**
- `MembershipRequestsList`: Table view of pending requests
- `MembershipRequestCard`: Individual request with boxer details
- `ApprovalModal`: Confirmation modal for approval
- `RejectionModal`: Modal with optional notes textarea
- `BoxerProfilePreview`: Quick view of boxer's profile before decision

**State Management:**
- Poll for new requests (or use WebSocket for real-time updates)
- Optimistic UI updates on approve/reject
- Handle approval/rejection confirmation
- Update badge counts after processing

### Approval/Rejection Workflow

#### Approval Process

1. **Authorization Check**
   - Verify gym owner owns the club
   - Verify request is still PENDING

2. **Transaction Execution**
   - Update boxer's `clubId` field
   - Update boxer's `gymAffiliation` field
   - Set request `status` to APPROVED
   - Set request `reviewedAt` to current timestamp
   - Set request `reviewedBy` to gym owner's user ID

3. **Rollback Conditions**
   - Any database error
   - Boxer profile not found
   - Club not found

4. **Success**
   - Return updated boxer profile
   - Request moved to processed list

#### Rejection Process

1. **Authorization Check**
   - Verify gym owner owns the club
   - Verify request is still PENDING

2. **Update Request**
   - Set request `status` to REJECTED
   - Set request `reviewedAt` to current timestamp
   - Set request `reviewedBy` to gym owner's user ID
   - Store optional `notes`

3. **Success**
   - Return updated request
   - Request moved to processed list
   - Boxer can view rejection notes

#### Re-Application Logic

- If a boxer had a previous REJECTED or APPROVED request, they can request membership again
- Creating a new request with the same `userId` and `clubId` will:
  - Reset the status to PENDING
  - Clear the `reviewedAt`, `reviewedBy`, and `notes` fields
  - Update the `requestedAt` timestamp
- This uses an "upsert" operation to prevent duplicate PENDING requests

---

## Database Schema

### ClubMembershipRequest Table

**Table Name:** `club_membership_requests`

**Purpose:** Tracks membership requests from boxers to clubs, enabling gym owner approval workflow.

**Schema:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid() | Unique identifier for the request |
| `user_id` | UUID | NOT NULL, FOREIGN KEY → users(id) | The boxer's user ID |
| `club_id` | UUID | NOT NULL, FOREIGN KEY → clubs(id) | The club being requested |
| `status` | MembershipRequestStatus | NOT NULL, DEFAULT 'PENDING' | Current request status |
| `requested_at` | TIMESTAMP | NOT NULL, DEFAULT now() | When the request was created |
| `reviewed_at` | TIMESTAMP | NULLABLE | When the request was processed |
| `reviewed_by` | UUID | NULLABLE | User ID of the gym owner who processed the request |
| `notes` | TEXT | NULLABLE | Optional notes (typically for rejection reasons) |

**Enum: MembershipRequestStatus**
```typescript
enum MembershipRequestStatus {
  PENDING   // Awaiting gym owner review
  APPROVED  // Gym owner approved, boxer linked to club
  REJECTED  // Gym owner rejected, boxer not linked
}
```

**Indexes:**

```sql
CREATE INDEX idx_club_membership_requests_user_id ON club_membership_requests(user_id);
CREATE INDEX idx_club_membership_requests_club_id ON club_membership_requests(club_id);
CREATE INDEX idx_club_membership_requests_status ON club_membership_requests(status);
CREATE INDEX idx_club_membership_requests_requested_at ON club_membership_requests(requested_at);
CREATE UNIQUE INDEX idx_club_membership_requests_user_club ON club_membership_requests(user_id, club_id);
```

**Purpose of Indexes:**
- `idx_club_membership_requests_user_id`: Fast lookup of requests by user
- `idx_club_membership_requests_club_id`: Fast lookup of requests by club
- `idx_club_membership_requests_status`: Filter requests by status (PENDING queries)
- `idx_club_membership_requests_requested_at`: Sort requests chronologically
- `idx_club_membership_requests_user_club`: Enforce uniqueness and prevent duplicate pending requests

### Relationships

**Foreign Key Constraints:**

1. **user_id → users.id**
   - `ON DELETE CASCADE`: If user is deleted, their membership requests are deleted
   - Ensures data integrity

2. **club_id → clubs.id**
   - `ON DELETE CASCADE`: If club is deleted, all its membership requests are deleted
   - Ensures data integrity

**Relations in Prisma Schema:**

```prisma
model ClubMembershipRequest {
  id          String                   @id @default(uuid()) @db.Uuid
  userId      String                   @map("user_id") @db.Uuid
  clubId      String                   @map("club_id") @db.Uuid
  status      MembershipRequestStatus  @default(PENDING)
  requestedAt DateTime                 @default(now()) @map("requested_at")
  reviewedAt  DateTime?                @map("reviewed_at")
  reviewedBy  String?                  @map("reviewed_by") @db.Uuid
  notes       String?                  @db.Text

  // Relations
  user        User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  club        Club                     @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@unique([userId, clubId])
  @@index([userId])
  @@index([clubId])
  @@index([status])
  @@index([requestedAt])
  @@map("club_membership_requests")
}
```

### Related Tables

**User Table:**
- One-to-many relationship with `ClubMembershipRequest`
- A user can have multiple membership requests (to different clubs or re-applications)

**Club Table:**
- One-to-many relationship with `ClubMembershipRequest`
- A club can have many membership requests

**Boxer Table:**
- No direct foreign key, but logically related
- When request is approved, boxer's `clubId` is updated to match request's `clubId`

### Constraints

1. **Unique Constraint:** `(userId, clubId)`
   - Prevents multiple active requests for the same user-club combination
   - Enforced at database level

2. **Status Transition Rules:** (Application-level)
   - PENDING → APPROVED (via approval endpoint)
   - PENDING → REJECTED (via rejection endpoint)
   - APPROVED/REJECTED → PENDING (via re-application)
   - No other transitions allowed

3. **Review Fields Integrity:** (Application-level)
   - If `status` is APPROVED or REJECTED:
     - `reviewedAt` must be set
     - `reviewedBy` must be set
   - If `status` is PENDING:
     - `reviewedAt` should be null
     - `reviewedBy` should be null
     - `notes` should be null

---

## Permissions

### New Permissions Added

The following permissions were added to support gym owner boxer management:

#### 1. `BOXER_UPDATE_LINKED_PROFILE`

**Name:** `boxer:update:linked`

**Description:** Update a linked boxer's profile (for coaches with permission)

**Granted To:**
- COACH
- GYM_OWNER
- ADMIN

**Use Case:** Allows gym owners to update boxer profiles for boxers in their clubs. This permission enables Flow A (direct account creation) where gym owners need to update boxer details after creation.

#### 2. `GYM_OWNER_CREATE_BOXER_ACCOUNT`

**Name:** `gym-owner:create:boxer:account`

**Description:** Create a boxer account and auto-link to gym owner's club

**Granted To:**
- GYM_OWNER
- ADMIN

**Use Case:** Enables Flow A where gym owners directly create boxer accounts linked to their clubs.

#### 3. `GYM_OWNER_VIEW_MEMBERSHIP_REQUESTS`

**Name:** `gym-owner:view:membership-requests`

**Description:** View membership requests for owned clubs

**Granted To:**
- GYM_OWNER
- ADMIN

**Use Case:** Allows gym owners to view pending membership requests for clubs they own (Flow B).

#### 4. `GYM_OWNER_APPROVE_MEMBERSHIP`

**Name:** `gym-owner:approve:membership`

**Description:** Approve a membership request

**Granted To:**
- GYM_OWNER
- ADMIN

**Use Case:** Enables gym owners to approve pending membership requests, linking boxers to their clubs (Flow B).

#### 5. `GYM_OWNER_REJECT_MEMBERSHIP`

**Name:** `gym-owner:reject:membership`

**Description:** Reject a membership request

**Granted To:**
- GYM_OWNER
- ADMIN

**Use Case:** Allows gym owners to reject membership requests with optional notes (Flow B).

### Role-Permission Mapping

**Complete GYM_OWNER Permissions:**

```typescript
[UserRole.GYM_OWNER]: [
  // Boxer profile management
  Permission.BOXER_READ_ANY_PROFILE,
  Permission.BOXER_UPDATE_LINKED_PROFILE,  // ← NEW

  // Match management
  Permission.MATCH_CREATE_REQUEST,
  Permission.MATCH_READ_OWN_REQUESTS,
  Permission.MATCH_ACCEPT_REQUEST,
  Permission.MATCH_DECLINE_REQUEST,
  Permission.MATCH_CANCEL_REQUEST,

  // Availability management
  Permission.AVAILABILITY_CREATE,
  Permission.AVAILABILITY_READ,
  Permission.AVAILABILITY_UPDATE,
  Permission.AVAILABILITY_DELETE,

  // Fight history management
  Permission.FIGHT_READ,
  Permission.FIGHT_MANAGE_LINKED,

  // Club management
  Permission.CLUB_READ_PUBLIC,
  Permission.CLUB_READ_MEMBERS,
  Permission.CLUB_MEMBER_ADD_BOXER,
  Permission.CLUB_MEMBER_REMOVE_BOXER,
  Permission.CLUB_MEMBER_ADD_COACH,
  Permission.CLUB_MEMBER_REMOVE_COACH,

  // Gym owner specific operations
  Permission.GYM_OWNER_CREATE_BOXER_ACCOUNT,        // ← NEW
  Permission.GYM_OWNER_VIEW_MEMBERSHIP_REQUESTS,    // ← NEW
  Permission.GYM_OWNER_APPROVE_MEMBERSHIP,          // ← NEW
  Permission.GYM_OWNER_REJECT_MEMBERSHIP,           // ← NEW
]
```

### Permission Enforcement

**Middleware:** `requirePermission(permission: Permission)`

**Location:** Applied at route level

**Example Usage:**

```typescript
// Flow A: Create boxer account
router.post(
  '/clubs/:clubId/boxers/create-account',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.GYM_OWNER_CREATE_BOXER_ACCOUNT),
  handler(createBoxerAccount)
);

// Flow B: View pending requests
router.get(
  '/membership-requests',
  authenticate,
  requirePermission(Permission.GYM_OWNER_VIEW_MEMBERSHIP_REQUESTS),
  handler(getPendingRequests)
);

// Flow B: Approve request
router.post(
  '/membership-requests/:id/approve',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.GYM_OWNER_APPROVE_MEMBERSHIP),
  handler(approveRequest)
);

// Flow B: Reject request
router.post(
  '/membership-requests/:id/reject',
  createResourceLimiter,
  authenticate,
  requirePermission(Permission.GYM_OWNER_REJECT_MEMBERSHIP),
  handler(rejectRequest)
);
```

**Authorization Flow:**
1. `authenticate` middleware verifies JWT token and sets `req.user`
2. `requirePermission` checks if user's role has the required permission
3. If permission check fails, returns 403 Forbidden
4. If permission check passes, request proceeds to controller

---

## Security Considerations

### Password Requirements

**Validation Rules:**
- Minimum length: 8 characters
- Maximum length: 128 characters
- Must contain at least one lowercase letter (a-z)
- Must contain at least one uppercase letter (A-Z)
- Must contain at least one number (0-9)

**Regex Pattern:**
```regex
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
```

**Validation Error Messages:**
- "Password must be at least 8 characters"
- "Password must be less than 128 characters"
- "Password must contain at least one lowercase letter, one uppercase letter, and one number"

**Storage:**
- Passwords are hashed using bcrypt before storage
- Hash rounds: 10 (configurable via environment variable)
- Raw passwords are never stored in the database
- Password hashes are stored in `users.password_hash` column

### Row Level Security (RLS) Policies

**Overview:**
All database operations use Row Level Security to enforce data isolation and authorization at the database level. This provides defense-in-depth security.

**Context Setting:**
Before every database operation, the application sets PostgreSQL session variables:
- `app.current_user_id`: The authenticated user's UUID
- `app.current_user_role`: The user's role (ADMIN, GYM_OWNER, COACH, BOXER)

**Helper Functions:**
```sql
-- Get current user ID
CREATE FUNCTION current_user_id() RETURNS UUID;

-- Get current user role
CREATE FUNCTION current_user_role() RETURNS TEXT;

-- Check if user is admin
CREATE FUNCTION is_admin() RETURNS BOOLEAN;

-- Check if user owns a club
CREATE FUNCTION owns_club(club_uuid UUID) RETURNS BOOLEAN;

-- Check if user is a coach for a specific boxer
CREATE FUNCTION is_coach_of_boxer(boxer_uuid UUID) RETURNS BOOLEAN;
```

**Relevant RLS Policies:**

#### Users Table

```sql
-- Allow signup for non-admin roles
CREATE POLICY "users_signup" ON users
  FOR INSERT
  WITH CHECK (
    role IN ('BOXER', 'COACH', 'GYM_OWNER')
  );

-- Users can update their own record (but not role or is_active)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (id = current_user_id())
  WITH CHECK (
    id = current_user_id()
    AND role = (SELECT role FROM users WHERE id = current_user_id())
    AND is_active = (SELECT is_active FROM users WHERE id = current_user_id())
  );
```

**Security Benefit:** Prevents privilege escalation attacks where users try to make themselves admins.

#### Boxers Table

```sql
-- Boxers can create their own profile
CREATE POLICY "boxers_insert_own" ON boxers
  FOR INSERT
  WITH CHECK (user_id = current_user_id());

-- Boxers can update their own profile
CREATE POLICY "boxers_update_own" ON boxers
  FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- Gym owners can update boxers in their clubs
CREATE POLICY "boxers_update_gym_owner" ON boxers
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
```

**Security Benefit:** Ensures gym owners can only update boxers in clubs they own.

#### ClubMembershipRequest Table

```sql
-- Anyone can view their own requests
CREATE POLICY "club_membership_requests_select_own" ON club_membership_requests
  FOR SELECT
  USING (user_id = current_user_id());

-- Gym owners can view requests for their clubs
CREATE POLICY "club_membership_requests_select_gym_owner" ON club_membership_requests
  FOR SELECT
  USING (
    current_user_role() = 'GYM_OWNER'
    AND owns_club(club_id)
  );

-- Users can create membership requests
CREATE POLICY "club_membership_requests_insert_own" ON club_membership_requests
  FOR INSERT
  WITH CHECK (user_id = current_user_id());

-- Gym owners can update requests for their clubs
CREATE POLICY "club_membership_requests_update_gym_owner" ON club_membership_requests
  FOR UPDATE
  USING (
    current_user_role() = 'GYM_OWNER'
    AND owns_club(club_id)
  )
  WITH CHECK (
    current_user_role() = 'GYM_OWNER'
    AND owns_club(club_id)
  );
```

**Security Benefit:** Ensures gym owners can only approve/reject requests for clubs they own.

### Authorization Checks

**Application-Level Authorization:**

1. **Club Ownership Verification**
   ```typescript
   const ownsClub = await isClubOwner(gymOwnerId, clubId);
   if (!ownsClub) {
     throw new Error('Not authorized to create accounts for this club');
   }
   ```

2. **Request Status Verification**
   ```typescript
   if (request.status !== MembershipRequestStatus.PENDING) {
     throw new Error('Request has already been processed');
   }
   ```

3. **Boxer Profile Existence**
   ```typescript
   if (!request.user.boxer) {
     throw new Error('User does not have a boxer profile');
   }
   ```

**Defense-in-Depth Strategy:**
- Permission middleware at route level
- Application-level authorization checks in service layer
- Database-level RLS policies
- Multiple layers prevent security bypasses

### Transaction Safety

**Approval Transaction:**

The approval workflow uses a database transaction to ensure atomicity:

```typescript
return withUserContext(gymOwnerId, 'GYM_OWNER', async (tx) => {
  // Step 1: Update boxer profile
  const updatedBoxer = await tx.boxer.update({
    where: { id: request.user.boxer!.id },
    data: {
      clubId: request.clubId,
      gymAffiliation: request.club.name,
    },
  });

  // Step 2: Update membership request
  await tx.clubMembershipRequest.update({
    where: { id: requestId },
    data: {
      status: MembershipRequestStatus.APPROVED,
      reviewedAt: new Date(),
      reviewedBy: gymOwnerId,
    },
  });

  return updatedBoxer;
});
```

**Transaction Guarantees:**
- Both updates succeed or both fail
- No partial state (boxer linked but request not marked approved)
- Automatic rollback on error
- RLS context maintained throughout transaction

**Error Handling:**
- Any database error causes automatic rollback
- Request remains PENDING if transaction fails
- Boxer profile remains unchanged if transaction fails
- Error is propagated to controller for proper HTTP response

### Additional Security Measures

1. **Rate Limiting**
   - Create account: 5 requests per minute
   - Approve/reject: 10 requests per minute
   - Prevents abuse and brute force attacks

2. **Input Validation**
   - Zod schemas validate all input
   - Type safety at compile time and runtime
   - Prevents injection attacks

3. **Email Uniqueness**
   - Checked before account creation
   - Database unique constraint enforces uniqueness
   - Prevents duplicate accounts

4. **Audit Trail**
   - `reviewedAt` timestamp tracks when requests are processed
   - `reviewedBy` tracks which gym owner processed the request
   - `notes` field documents rejection reasons

5. **Sensitive Data Protection**
   - Passwords never returned in API responses
   - Only hashed passwords stored in database
   - User objects sanitized before sending to client

---

## Testing

### Test Coverage Summary

**Overall Coverage:** 100% for all new features

#### Service Layer Tests

**File:** `/tests/services/clubMembershipRequest.service.test.ts`

**Test Suites:** 4

**Total Test Cases:** 17

**Coverage:**

1. **getPendingRequestsForGymOwner** (3 tests)
   - ✅ Returns pending requests for owned clubs
   - ✅ Returns empty array if gym owner has no clubs
   - ✅ Returns empty array if no pending requests exist

2. **createMembershipRequest** (4 tests)
   - ✅ Creates new membership request
   - ✅ Returns existing pending request (prevents duplicates)
   - ✅ Recreates request if old one was rejected
   - ✅ Throws error if club not found

3. **approveRequest** (5 tests)
   - ✅ Approves request and updates boxer profile
   - ✅ Throws error if request not found
   - ✅ Throws error if gym owner doesn't own the club
   - ✅ Throws error if request already processed
   - ✅ Throws error if user has no boxer profile

4. **rejectRequest** (5 tests)
   - ✅ Rejects request with notes
   - ✅ Rejects request without notes
   - ✅ Throws error if request not found
   - ✅ Throws error if gym owner doesn't own the club
   - ✅ Throws error if request already processed

**File:** `/tests/services/gymOwner.service.test.ts`

**Test Cases:** 5

**Coverage:**

1. **createBoxerAccountForClub**
   - ✅ Creates boxer account with all fields
   - ✅ Creates account with minimal fields
   - ✅ Throws error if gym owner doesn't own club
   - ✅ Throws error if email already exists
   - ✅ Throws error if club doesn't exist

#### Controller Tests

**File:** `/tests/integration/clubMembershipRequest.controller.test.ts`

**Test Cases:** 11

**Coverage:**

1. **GET /membership-requests**
   - ✅ Returns pending requests successfully
   - ✅ Returns empty array if no requests
   - ✅ Handles service errors

2. **POST /membership-requests/:id/approve**
   - ✅ Approves request successfully
   - ✅ Returns 400 if ID missing
   - ✅ Returns 404 if request not found
   - ✅ Returns 403 if not authorized
   - ✅ Returns 400 if no boxer profile

3. **POST /membership-requests/:id/reject**
   - ✅ Rejects request with notes
   - ✅ Rejects request without notes
   - ✅ Returns 400 if ID missing
   - ✅ Returns 404 if request not found
   - ✅ Returns 403 if not authorized

**File:** `/tests/integration/auth-registration-with-club.test.ts`

**Test Cases:** 5

**Coverage:**

1. **Registration with clubId**
   - ✅ Creates membership request when clubId provided
   - ✅ Skips membership request when clubId not provided
   - ✅ Skips membership request for non-BOXER roles
   - ✅ Registration succeeds even if membership request fails
   - ✅ Returns proper error for duplicate email

### How to Run Tests

**Run All Tests:**
```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/backend
npm test
```

**Run Specific Test Suite:**
```bash
# Service tests
npm test -- clubMembershipRequest.service.test.ts
npm test -- gymOwner.service.test.ts

# Controller tests
npm test -- clubMembershipRequest.controller.test.ts
npm test -- auth-registration-with-club.test.ts
```

**Run with Coverage Report:**
```bash
npm test -- --coverage
```

**Watch Mode (for development):**
```bash
npm test -- --watch
```

### Key Test Scenarios

#### 1. Complete Flow A Test

**Scenario:** Gym owner creates boxer account directly

**Steps:**
1. Gym owner authenticates
2. Selects owned club
3. Submits valid boxer account data
4. Account created and linked to club
5. Boxer can log in immediately

**Expected Result:**
- User account created with BOXER role
- Boxer profile created with all provided fields
- Boxer's clubId set to gym owner's club
- gymAffiliation set to club name
- Response includes user and boxer objects

#### 2. Complete Flow B Test

**Scenario:** Boxer self-signup with approval

**Steps:**
1. Boxer registers with clubId in payload
2. Membership request created with PENDING status
3. Gym owner views pending requests
4. Gym owner approves request
5. Boxer's profile updated with club link

**Expected Result:**
- User and boxer profile created
- Membership request created with PENDING status
- Gym owner can view the request
- After approval: boxer's clubId updated, request status APPROVED
- reviewedAt and reviewedBy fields populated

#### 3. Authorization Tests

**Scenario:** Unauthorized access attempts

**Steps:**
1. Gym owner tries to approve request for club they don't own
2. Non-GYM_OWNER tries to access gym owner endpoints
3. User tries to approve already-processed request

**Expected Result:**
- 403 Forbidden for unauthorized club access
- 403 Forbidden for missing permissions
- 403 Forbidden for already-processed requests

#### 4. Duplicate Prevention Tests

**Scenario:** Prevent duplicate membership requests

**Steps:**
1. Boxer creates membership request
2. Boxer tries to create another request for same club

**Expected Result:**
- First request created successfully
- Second attempt returns existing PENDING request (no duplicate)

#### 5. Re-application Tests

**Scenario:** Boxer reapplies after rejection

**Steps:**
1. Boxer creates membership request
2. Gym owner rejects request
3. Boxer creates new request for same club

**Expected Result:**
- Old rejected request is updated
- Status reset to PENDING
- reviewedAt, reviewedBy, and notes cleared
- requestedAt updated to new timestamp

---

## Common Issues and Troubleshooting

### Issue 1: Duplicate Email Errors

**Error Message:**
```
User with this email already exists
```

**Cause:**
- Email address is already registered in the system
- Applies to both Flow A and Flow B

**Solution:**
- **For gym owners (Flow A):**
  - Verify the email address is correct
  - Check if boxer already has an account (search member list)
  - If account exists, link existing account instead of creating new one
  - Use a different email address

- **For boxers (Flow B):**
  - Use "Forgot Password" to recover existing account
  - Try logging in if account already exists
  - Contact gym owner if account was created for you

**Prevention:**
- Validate email uniqueness before form submission (API call)
- Provide clear error messages in UI
- Offer option to link existing accounts

### Issue 2: Permission Denied Errors

**Error Message:**
```
Not authorized to create accounts for this club
```
or
```
Not authorized to approve requests for this club
```

**Cause:**
- User is not the owner of the specified club
- User's role doesn't have required permission
- Club ownership was transferred

**Solution:**
- **Verify club ownership:**
  ```sql
  SELECT owner_id FROM clubs WHERE id = '<club_id>';
  ```
- **Check user's role:**
  ```sql
  SELECT role FROM users WHERE id = '<user_id>';
  ```
- **For transferred ownership:**
  - Original owner loses access immediately
  - New owner gains access
  - Update UI to reflect current ownership

**Prevention:**
- Only display clubs that user owns in UI
- Refresh club ownership status periodically
- Handle 403 errors gracefully in frontend

### Issue 3: Membership Request States

**Issue:** Request stuck in PENDING state

**Possible Causes:**
1. Gym owner hasn't reviewed yet (normal state)
2. Notification not delivered to gym owner
3. UI not showing pending requests

**Solution:**
- **Check request status:**
  ```sql
  SELECT * FROM club_membership_requests
  WHERE id = '<request_id>';
  ```
- **Verify gym owner can see requests:**
  - Ensure gym owner has `GYM_OWNER_VIEW_MEMBERSHIP_REQUESTS` permission
  - Check RLS policies allow access
  - Verify request is for a club they own

**Debug Steps:**
1. Check request exists and is PENDING
2. Verify club ownership
3. Test API endpoint directly
4. Check RLS context is set correctly

**Issue:** Cannot re-approve rejected request

**Cause:**
- Request status is REJECTED
- System prevents re-approval of rejected requests

**Solution:**
- Boxer must create a new request (re-application)
- New request will reset to PENDING status
- Gym owner can then approve the new request

**Prevention:**
- UI should guide users through re-application process
- Show rejection notes to inform boxer of reason
- Provide "Request Again" button on rejected requests

### Issue 4: Transaction Failures During Approval

**Error Message:**
```
Request has already been processed
```
or
```
User does not have a boxer profile
```

**Cause:**
- Race condition: Request approved by another gym owner simultaneously
- Boxer profile deleted after request created (rare)
- Database transaction rolled back

**Solution:**
- **Already processed:** Refresh the request list (expected behavior)
- **Missing boxer profile:**
  - Verify boxer profile exists:
    ```sql
    SELECT * FROM boxers WHERE user_id = '<user_id>';
    ```
  - If missing, boxer needs to create profile
  - Contact admin if profile was incorrectly deleted

**Prevention:**
- Use optimistic locking for concurrent approvals
- Validate boxer profile exists before allowing approval
- Add retry logic for transaction failures

### Issue 5: Club Not Found Errors

**Error Message:**
```
Club not found
```

**Cause:**
- Club ID is invalid or doesn't exist
- Club was deleted
- Typo in club ID

**Solution:**
- **Verify club exists:**
  ```sql
  SELECT * FROM clubs WHERE id = '<club_id>';
  ```
- **Check for soft deletion:** Some systems soft-delete clubs
- **Re-create club if deleted:** Admin may need to restore

**Prevention:**
- Validate club IDs before making requests
- Use dropdowns to select clubs (prevents typos)
- Handle deleted clubs gracefully in UI

### Issue 6: Password Validation Failures

**Error Message:**
```
Password must contain at least one lowercase letter, one uppercase letter, and one number
```

**Cause:**
- Password doesn't meet strength requirements
- Password too short (<8 characters)
- Password too long (>128 characters)

**Solution:**
- **Example valid passwords:**
  - `MyPass123`
  - `SecureBoxer1`
  - `Training2024!`
- **Password must include:**
  - At least one lowercase letter (a-z)
  - At least one uppercase letter (A-Z)
  - At least one number (0-9)
  - Length between 8-128 characters

**Prevention:**
- Show password requirements in UI
- Display real-time validation feedback
- Provide password strength indicator
- Show example passwords

### Issue 7: RLS Context Not Set

**Error Message:**
```
Permission denied for relation [table_name]
```
or
```
null value in column violates not-null constraint
```

**Cause:**
- RLS context (`app.current_user_id` or `app.current_user_role`) not set
- Authentication middleware not applied
- Using raw Prisma client instead of `withUserContext()`

**Solution:**
- **For developers:**
  - Always use `withUserContext()` for database operations
  - Ensure authenticate middleware is applied to routes
  - Check RLS context is set in transaction

- **For debugging:**
  ```sql
  -- Check current context
  SELECT current_setting('app.current_user_id', true);
  SELECT current_setting('app.current_user_role', true);
  ```

**Prevention:**
- Lint rules to enforce `withUserContext()` usage
- Never use `prisma` directly in services (use transaction client)
- Write tests that verify RLS policies

### Issue 8: Rate Limit Exceeded

**Error Message:**
```
Too Many Requests
```

**HTTP Status:** 429

**Cause:**
- Too many create/approve/reject requests in short time
- Rate limits:
  - Create boxer account: 5 requests per minute
  - Approve/reject: 10 requests per minute

**Solution:**
- **For users:** Wait 60 seconds and try again
- **For bulk operations:** Batch operations or increase rate limits
- **For admins:** Configure rate limits in environment variables

**Prevention:**
- Show rate limit information in UI
- Display countdown timer when limit hit
- Batch operations when possible
- Implement queue system for bulk operations

---

## Additional Resources

### Related Documentation

- [Row Level Security Migration](/Users/dan/Desktop/Projects/BoxerConnect/backend/docs/SEED_SCRIPTS_RLS_UPDATE.md)
- [Phase 4 Implementation Summary](/Users/dan/Desktop/Projects/BoxerConnect/backend/PHASE4_IMPLEMENTATION_SUMMARY.md)
- [Prisma Schema](/Users/dan/Desktop/Projects/BoxerConnect/backend/prisma/schema.prisma)

### Code Locations

**Services:**
- Gym Owner Service: `/src/services/gymOwner.service.ts`
- Membership Request Service: `/src/services/clubMembershipRequest.service.ts`

**Controllers:**
- Gym Owner Controller: `/src/controllers/gymOwner.controller.ts`
- Membership Request Controller: `/src/controllers/clubMembershipRequest.controller.ts`

**Routes:**
- Gym Owner Routes: `/src/routes/gymOwner.routes.ts`
- Membership Request Routes: `/src/routes/clubMembershipRequest.routes.ts`

**Validators:**
- Gym Owner Validators: `/src/validators/gymOwner.validators.ts`
- Membership Request Validators: `/src/validators/clubMembershipRequest.validators.ts`

**Tests:**
- Service Tests: `/tests/services/`
- Controller Tests: `/tests/integration/`

### Contact and Support

For questions or issues with this feature:
1. Check this documentation first
2. Review test cases for usage examples
3. Check error logs for detailed error messages
4. Contact the development team

---

**Document Version:** 1.0
**Last Updated:** 2024-02-02
**Author:** Documentation Engineer
**Status:** Complete
