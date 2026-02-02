# Gym Owner Dashboard

Comprehensive documentation for the BoxerConnect Gym Owner Dashboard feature.

## Table of Contents

- [Overview](#overview)
- [User Guide](#user-guide)
  - [Accessing the Dashboard](#accessing-the-dashboard)
  - [Dashboard Navigation](#dashboard-navigation)
  - [Managing Clubs](#managing-clubs)
  - [Viewing Boxers and Coaches](#viewing-boxers-and-coaches)
  - [Creating Match Requests](#creating-match-requests)
- [Technical Documentation](#technical-documentation)
  - [Architecture Overview](#architecture-overview)
  - [Backend API](#backend-api)
  - [Frontend Components](#frontend-components)
  - [State Management](#state-management)
  - [Security and Permissions](#security-and-permissions)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is the Gym Owner Dashboard?

The Gym Owner Dashboard is a dedicated management interface for gym owners to oversee their boxing clubs, manage members (boxers and coaches), and coordinate match requests across all clubs they own.

### Key Features

- **Multi-Club Management**: View and manage all clubs owned by the authenticated gym owner
- **Centralized Statistics**: Dashboard overview showing total clubs, boxers, coaches, and pending match requests
- **Boxer Management**: View all boxers across owned clubs, access their profiles, and create match requests
- **Coach Management**: View all coaches across owned clubs and their assignments
- **Match Request System**: Create match requests for boxers, find compatible opponents, and manage incoming/outgoing requests
- **Club Details**: Detailed view of each club including all members (boxers and coaches)

### Who Can Access?

The gym owner dashboard is exclusively available to users with the `GYM_OWNER` role. Access is enforced through:

- Frontend route guards (GymOwnerLayout component)
- Backend authentication middleware
- Role-based permission checks on all API endpoints

### User Roles and Permissions

The following permissions are granted to gym owners:

- `CLUB_READ_MEMBERS`: View club members (boxers and coaches)
- `CLUB_MEMBER_ADD_BOXER`: Add boxers to owned clubs
- `CLUB_MEMBER_REMOVE_BOXER`: Remove boxers from owned clubs
- `CLUB_MEMBER_ADD_COACH`: Add coaches to owned clubs
- `CLUB_MEMBER_REMOVE_COACH`: Remove coaches from owned clubs
- `MATCH_CREATE_REQUEST`: Create match requests for club boxers
- `MATCH_ACCEPT_REQUEST`: Accept incoming match requests
- `MATCH_DECLINE_REQUEST`: Decline incoming match requests
- `MATCH_CANCEL_REQUEST`: Cancel outgoing match requests
- `BOXER_READ_ANY_PROFILE`: View any boxer's profile
- `AVAILABILITY_READ`: View boxer availability

---

## User Guide

### Accessing the Dashboard

1. **Login**: Sign in to BoxerConnect with credentials assigned the `GYM_OWNER` role
2. **Automatic Redirect**: Users with gym owner role are automatically redirected to `/gym-owner` after login
3. **Navigation**: Access the dashboard at any time by navigating to `/gym-owner`

**Note**: Users without the gym owner role attempting to access `/gym-owner/*` routes will be redirected to the main dashboard.

### Dashboard Navigation

The gym owner dashboard includes a dedicated sidebar with the following sections:

- **Dashboard** (`/gym-owner`): Overview with statistics and quick actions
- **My Clubs** (`/gym-owner/clubs`): List of all owned clubs with details
- **Boxers** (`/gym-owner/boxers`): All boxers across owned clubs
- **Coaches** (`/gym-owner/coaches`): All coaches across owned clubs
- **Match Requests** (`/gym-owner/matches`): Create and manage match requests

### Managing Clubs

#### Viewing Owned Clubs

Navigate to **My Clubs** to see all clubs assigned to your account. Each club card displays:

- Club name
- Region
- Address and postcode
- Number of boxers
- Number of coaches
- "View Details" button

#### Club Details Page

Click "View Details" on any club to see:

- Complete club information
- Owner details
- Full list of boxers with their profiles
- Full list of coaches and head coach designation
- Quick actions to view profiles or create match requests

#### Empty State

If no clubs are assigned, you'll see a message: "No Clubs Assigned. Please contact an administrator to get started."

**Note**: Only system administrators can assign club ownership using the `PUT /api/v1/clubs/:id/owner` endpoint.

### Viewing Boxers and Coaches

#### All Boxers View

Navigate to **Boxers** to see a comprehensive table of all boxers across your clubs:

- Boxer name
- Club affiliation
- Experience level
- Weight (kg)
- Fight record (wins-losses-draws)
- Actions: View Profile, Find Matches

**Features**:
- Click any row to view the boxer's full profile
- Use "View Profile" to navigate to the boxer's public profile page
- Use "Find Matches" to jump to the Match Requests page with the boxer pre-selected

#### All Coaches View

Navigate to **Coaches** to see all coaches across your clubs:

- Coach name
- Club affiliation
- Head coach designation
- Contact information (email)
- Actions: View Details, Manage Assignment

### Creating Match Requests

#### Step 1: Select a Boxer

Navigate to **Match Requests** and use the dropdown to select a boxer from your clubs.

The dropdown shows:
- Boxer name
- Club affiliation
- Experience level
- Weight (if available)

#### Step 2: Find Compatible Matches

Click "Find Compatible Matches" to search for suitable opponents based on:
- Similar weight class
- Compatible experience level
- Availability

#### Step 3: Review Matches

The system displays a list of compatible boxers with:
- Compatibility score
- Fighter details (weight, experience, record)
- Club affiliation
- "Send Request" button

#### Step 4: Send Request

Click "Send Request" on a compatible boxer to open the request dialog. Provide:

- **Proposed Date**: When the match should occur
- **Venue** (optional): Location for the match
- **Match Type** (optional): Exhibition, competitive, sparring, etc.
- **Additional Notes** (optional): Any special requirements or details

Click "Send Request" to submit. The request will appear in the "Outgoing Requests" section.

#### Managing Requests

**Incoming Requests**: Requests from other gym owners/coaches for your boxers
- View all details
- Accept or Decline
- Filter by status

**Outgoing Requests**: Requests you've sent for your boxers
- View status (pending, accepted, declined)
- Cancel pending requests
- Track progress

---

## Technical Documentation

### Architecture Overview

The gym owner dashboard follows a modern React + Redux architecture with a Node.js/Express backend.

**Frontend Stack**:
- React 18 with TypeScript
- Redux Toolkit for state management
- React Router for navigation
- Axios for API calls
- Tailwind CSS + shadcn/ui components

**Backend Stack**:
- Node.js + Express
- PostgreSQL with Prisma ORM
- JWT authentication
- Row-Level Security (RLS) policies
- Role-based permission system

### Backend API

#### New Endpoint: GET /api/v1/clubs/my-clubs

**Purpose**: Retrieve all clubs owned by the authenticated gym owner.

**Location**:
- Route: `/Users/dan/Desktop/Projects/BoxerConnect/backend/src/routes/club.routes.ts`
- Controller: `/Users/dan/Desktop/Projects/BoxerConnect/backend/src/controllers/club.controller.ts`
- Service: `/Users/dan/Desktop/Projects/BoxerConnect/backend/src/services/club.service.ts`

**Authentication**: Required (JWT token)

**Authorization**: `GYM_OWNER` role only (enforced in controller)

**Route Definition**:
```typescript
router.get(
  '/my-clubs',
  standardLimiter,
  authenticate,
  handler(getMyClubs)
);
```

**Controller Implementation**:
```typescript
export async function getMyClubs(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Verify user is a gym owner
    if (req.user.role !== 'GYM_OWNER') {
      return next(new ForbiddenError('Only gym owners can access this endpoint'));
    }

    const clubs = await getClubsByOwnerService(req.user.userId);

    sendSuccess(res, { clubs }, 'Clubs retrieved successfully');
  } catch (error: unknown) {
    next(error);
  }
}
```

**Service Implementation**:
Uses Prisma to query clubs where `ownerUserId` matches the authenticated user's ID, filtered by Row-Level Security policies.

**Response Format**:
```json
{
  "success": true,
  "data": {
    "clubs": [
      {
        "id": "uuid",
        "name": "Club Name",
        "region": "South Wales",
        "address": "123 Boxing St",
        "postcode": "CF10 1AA",
        "latitude": 51.4816,
        "longitude": -3.1791,
        "ownerUserId": "uuid",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    ]
  },
  "message": "Clubs retrieved successfully"
}
```

### Frontend Components

#### Component Structure

```
frontend/src/
├── components/gym-owner/
│   ├── GymOwnerLayout.tsx        # Layout wrapper with sidebar
│   └── GymOwnerSidebar.tsx       # Sidebar navigation
├── pages/gym-owner/
│   ├── GymOwnerDashboardPage.tsx # Dashboard overview
│   ├── MyClubsPage.tsx           # Clubs list
│   ├── ClubDetailPage.tsx        # Individual club details
│   ├── GymOwnerBoxersPage.tsx    # All boxers across clubs
│   ├── GymOwnerCoachesPage.tsx   # All coaches across clubs
│   └── GymOwnerMatchesPage.tsx   # Match request management
├── features/gym-owner/
│   └── gymOwnerSlice.ts          # Redux state management
└── services/
    └── gymOwnerService.ts        # API service layer
```

#### GymOwnerLayout Component

**Purpose**: Wrapper component that provides authentication, authorization, and consistent layout for all gym owner pages.

**Location**: `/Users/dan/Desktop/Projects/BoxerConnect/frontend/src/components/gym-owner/GymOwnerLayout.tsx`

**Key Features**:
- Authentication check (redirects to `/login` if not authenticated)
- Role check (redirects to `/dashboard` if not `GYM_OWNER`)
- Loading state handling
- Sidebar integration
- Renders child routes via `<Outlet />`

**Usage**:
```tsx
<Route path="/gym-owner" element={<GymOwnerLayout />}>
  <Route index element={<GymOwnerDashboardPage />} />
  <Route path="clubs" element={<MyClubsPage />} />
  {/* ... other routes */}
</Route>
```

#### GymOwnerSidebar Component

**Purpose**: Navigation sidebar with links to all gym owner sections.

**Location**: `/Users/dan/Desktop/Projects/BoxerConnect/frontend/src/components/gym-owner/GymOwnerSidebar.tsx`

**Navigation Items**:
- Dashboard (LayoutDashboard icon)
- My Clubs (Building2 icon)
- Boxers (Users icon)
- Coaches (UserCog icon)
- Match Requests (Calendar icon)

**Features**:
- Active route highlighting
- User information display (name, email)
- Logout functionality

#### GymOwnerDashboardPage Component

**Purpose**: Main dashboard showing statistics and quick actions.

**Location**: `/Users/dan/Desktop/Projects/BoxerConnect/frontend/src/pages/gym-owner/GymOwnerDashboardPage.tsx`

**Key Features**:
- Statistics cards: Total Clubs, Total Boxers, Total Coaches, Pending Match Requests
- Quick action buttons: View All Boxers, Create Match Request, Manage Clubs
- Empty state for gym owners without clubs
- Loading and error states

**Data Sources**:
- `fetchMyClubs()`: Loads owned clubs
- `fetchGymOwnerStats()`: Aggregates statistics from all clubs

#### GymOwnerBoxersPage Component

**Purpose**: Displays all boxers across owned clubs in a data table.

**Location**: `/Users/dan/Desktop/Projects/BoxerConnect/frontend/src/pages/gym-owner/GymOwnerBoxersPage.tsx`

**Key Features**:
- Loads all clubs and fetches members for each
- Aggregates boxers from all clubs
- Data table with sortable columns
- Actions: View Profile, Find Matches
- Click row to navigate to boxer profile

**Data Flow**:
1. Fetch owned clubs from Redux state
2. For each club, call `getClubWithMembers()`
3. Aggregate all boxers with club information
4. Display in data table

#### GymOwnerMatchesPage Component

**Purpose**: Create and manage match requests for club boxers.

**Location**: `/Users/dan/Desktop/Projects/BoxerConnect/frontend/src/pages/gym-owner/GymOwnerMatchesPage.tsx`

**Key Features**:
- Boxer selection dropdown (pre-populated from URL param if provided)
- Compatible match finder
- Send request dialog
- Incoming/outgoing request management
- Accept, decline, cancel actions

**Integrations**:
- `gymOwnerSlice`: Owned clubs and boxers
- `matchingSlice`: Compatible matches
- `requestsSlice`: Match requests
- `matchRequestService`: API calls for creating requests

### State Management

#### gymOwnerSlice

**Location**: `/Users/dan/Desktop/Projects/BoxerConnect/frontend/src/features/gym-owner/gymOwnerSlice.ts`

**State Shape**:
```typescript
interface GymOwnerState {
  ownedClubs: Club[];
  selectedClub: ClubWithMembers | null;
  stats: GymOwnerStats | null;
  clubsLoading: boolean;
  clubsError: string | null;
  selectedClubLoading: boolean;
  selectedClubError: string | null;
  statsLoading: boolean;
  statsError: string | null;
}
```

**Async Thunks**:
- `fetchMyClubs()`: Fetches clubs owned by authenticated user
- `fetchClubWithMembers(clubId)`: Fetches detailed club information including all members
- `fetchGymOwnerStats()`: Aggregates statistics from all clubs

**Reducers**:
- `clearSelectedClub`: Clears selected club and errors
- `clearClubsError`: Clears clubs error state
- `clearSelectedClubError`: Clears selected club error
- `clearStatsError`: Clears stats error

**Usage Example**:
```typescript
const dispatch = useAppDispatch();
const { ownedClubs, clubsLoading, clubsError } = useAppSelector(
  (state) => state.gymOwner
);

useEffect(() => {
  dispatch(fetchMyClubs());
}, [dispatch]);
```

#### Integration with Redux Store

**Location**: `/Users/dan/Desktop/Projects/BoxerConnect/frontend/src/app/store.ts`

```typescript
import gymOwnerReducer from '@/features/gym-owner/gymOwnerSlice';

export const store = configureStore({
  reducer: {
    // ... other reducers
    gymOwner: gymOwnerReducer,
  },
});
```

### Security and Permissions

#### Row-Level Security (RLS)

The gym owner dashboard leverages PostgreSQL Row-Level Security policies to ensure data isolation:

**Clubs Table RLS**:
- Gym owners can only query clubs where `ownerUserId` matches their user ID
- Automatic filtering at the database level
- No additional application logic required

**Example Policy**:
```sql
CREATE POLICY "Gym owners can read their own clubs"
  ON clubs
  FOR SELECT
  USING (
    auth.user_id() = "ownerUserId"
    OR auth.role() = 'ADMIN'
  );
```

#### Backend Authorization

**Role Check**: Every gym owner endpoint verifies the user's role:
```typescript
if (req.user.role !== 'GYM_OWNER') {
  return next(new ForbiddenError('Only gym owners can access this endpoint'));
}
```

**Permission Middleware**: Protected routes use `requirePermission()` middleware:
```typescript
router.get(
  '/:id/members',
  authenticate,
  requirePermission(Permission.CLUB_READ_MEMBERS, {
    resourceIdParam: 'id',
    resourceType: 'club',
  }),
  getClubMembers
);
```

**Ownership Verification**: When modifying clubs, the system verifies ownership:
```typescript
const isOwner = await isClubOwnerService(req.user.userId, clubId);
if (!isOwner && !isAdmin) {
  return next(new ForbiddenError('Only the club owner can perform this action'));
}
```

#### Frontend Route Guards

**GymOwnerLayout Protection**:
```typescript
// Redirect to login if not authenticated
if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}

// Redirect non-gym-owner users to dashboard
if (user?.role !== 'GYM_OWNER') {
  return <Navigate to="/dashboard" replace />;
}
```

#### Video Access Prevention

**Important Security Fix**: Gym owners should NOT fetch boxer videos on the dashboard to prevent unnecessary API calls and permission errors.

**Implementation**: The `GymOwnerDashboardPage` and related pages do not call video-related endpoints. Boxer profiles are fetched without video data unless explicitly viewing a boxer's detail page.

---

## API Reference

### GET /api/v1/clubs/my-clubs

Retrieve all clubs owned by the authenticated gym owner.

#### Request

**Method**: `GET`

**URL**: `/api/v1/clubs/my-clubs`

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Query Parameters**: None

**Authentication**: Required (JWT token in Authorization header)

**Authorization**: User must have `GYM_OWNER` role

#### Response

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "clubs": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Cardiff Boxing Club",
        "region": "South Wales",
        "address": "123 Boxing Street",
        "postcode": "CF10 1AA",
        "latitude": 51.4816,
        "longitude": -3.1791,
        "ownerUserId": "650e8400-e29b-41d4-a716-446655440000",
        "createdAt": "2026-01-15T10:30:00.000Z",
        "updatedAt": "2026-01-15T10:30:00.000Z"
      }
    ]
  },
  "message": "Clubs retrieved successfully"
}
```

**Error Responses**:

**401 Unauthorized** - Missing or invalid JWT token:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden** - User is not a gym owner:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Only gym owners can access this endpoint"
  }
}
```

**500 Internal Server Error** - Server error:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

#### Rate Limiting

- **Limit**: 100 requests per 15 minutes (standard limiter)
- **Headers**: Rate limit information included in response headers
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

#### Examples

**cURL**:
```bash
curl -X GET \
  https://api.boxerconnect.com/api/v1/clubs/my-clubs \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

**JavaScript (Axios)**:
```javascript
import axios from 'axios';

const response = await axios.get('/api/v1/clubs/my-clubs', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

console.log(response.data.data.clubs);
```

**TypeScript (Service)**:
```typescript
import { apiClient } from './apiClient';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

async function getMyClubs(): Promise<Club[]> {
  const response = await apiClient.get<ApiResponse<{ clubs: Club[] }>>(
    '/clubs/my-clubs'
  );
  return response.data.data?.clubs || [];
}
```

### GET /api/v1/clubs/:id/members

Retrieve detailed club information including all members (owner, boxers, coaches).

**Note**: This endpoint is used by the gym owner dashboard to fetch complete club details.

#### Request

**Method**: `GET`

**URL**: `/api/v1/clubs/:id/members`

**Path Parameters**:
- `id` (string, required): UUID of the club

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Authentication**: Required

**Authorization**: User must have `CLUB_READ_MEMBERS` permission and either:
- Be the club owner
- Be a system admin

#### Response

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "club": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Cardiff Boxing Club",
      "region": "South Wales",
      "address": "123 Boxing Street",
      "postcode": "CF10 1AA",
      "latitude": 51.4816,
      "longitude": -3.1791,
      "ownerUserId": "650e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-01-15T10:30:00.000Z",
      "owner": {
        "id": "650e8400-e29b-41d4-a716-446655440000",
        "name": "John Smith",
        "email": "john.smith@example.com",
        "role": "GYM_OWNER"
      },
      "boxers": [
        {
          "id": "boxer-uuid",
          "name": "Mike Tyson Jr.",
          "userId": "user-uuid",
          "weightKg": 75,
          "experienceLevel": "PROFESSIONAL",
          "wins": 10,
          "losses": 2,
          "draws": 1
        }
      ],
      "coaches": [
        {
          "id": "club-coach-uuid",
          "coachUserId": "coach-user-uuid",
          "isHead": true,
          "coach": {
            "id": "coach-user-uuid",
            "name": "Coach Smith",
            "email": "coach@example.com",
            "role": "COACH"
          }
        }
      ]
    }
  },
  "message": "Club members retrieved successfully"
}
```

**Error Responses**:

**404 Not Found** - Club not found:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Club not found"
  }
}
```

---

## Testing

### Backend Tests

**Location**: `/Users/dan/Desktop/Projects/BoxerConnect/backend/tests/integration/club.controller.test.ts`

**Test Coverage**:
- `GET /api/v1/clubs/my-clubs` endpoint
- Authentication requirements
- Role-based authorization (GYM_OWNER only)
- Returns correct clubs for owner
- Excludes clubs owned by other users
- Handles users with no clubs

**Run Tests**:
```bash
cd backend
npm test -- club.controller.test.ts
```

### Frontend Tests

**Location**: `/Users/dan/Desktop/Projects/BoxerConnect/frontend/src/services/__tests__/gymOwnerService.test.ts`

**Test Coverage**:
- `getMyClubs()` service method
- `getClubWithMembers()` service method
- API response handling
- Error handling

**Run Tests**:
```bash
cd frontend
npm test -- gymOwnerService.test.ts
```

### Manual Testing Checklist

- [ ] Gym owner can login and see dashboard
- [ ] Dashboard displays correct statistics
- [ ] Owned clubs list shows all assigned clubs
- [ ] Club details page shows all members
- [ ] Boxers page aggregates boxers from all clubs
- [ ] Coaches page aggregates coaches from all clubs
- [ ] Match requests page allows creating requests
- [ ] Compatible matches are found correctly
- [ ] Incoming requests can be accepted/declined
- [ ] Outgoing requests can be cancelled
- [ ] Non-gym-owner users cannot access routes
- [ ] Unauthenticated users are redirected to login

---

## Troubleshooting

### Issue: "Only gym owners can access this endpoint"

**Cause**: User does not have the `GYM_OWNER` role.

**Solution**:
1. Verify the user's role in the database
2. Contact an administrator to update the role if needed
3. Ensure the JWT token includes the correct role claim

### Issue: "No Clubs Assigned" message on dashboard

**Cause**: No clubs have been assigned to the gym owner.

**Solution**:
1. Contact a system administrator
2. Administrator must use `PUT /api/v1/clubs/:id/owner` to assign clubs
3. Refresh the dashboard after assignment

### Issue: Failed to fetch clubs

**Cause**: Network error, server error, or permission issue.

**Solution**:
1. Check browser console for error details
2. Verify authentication token is valid
3. Check server logs for detailed error
4. Ensure RLS policies are correctly configured
5. Verify user has clubs assigned in database

### Issue: Boxers/Coaches not loading

**Cause**: Error fetching club members.

**Solution**:
1. Check that clubs are loaded first
2. Verify `CLUB_READ_MEMBERS` permission is granted
3. Check network requests in browser dev tools
4. Ensure club IDs are valid

### Issue: Cannot create match requests

**Cause**: Missing boxers, permission denied, or network error.

**Solution**:
1. Verify boxers exist in owned clubs
2. Check that `MATCH_CREATE_REQUEST` permission is granted
3. Ensure selected boxer is valid
4. Check match request service logs

### Issue: Video-related errors on dashboard

**Cause**: Dashboard attempting to fetch boxer videos.

**Solution**:
This should not happen. If it does:
1. Verify the fix from commit `fa0e560` is applied
2. Check that `fetchMyClubs()` and `fetchGymOwnerStats()` do not include video fetching
3. Review component code to ensure no video API calls

---

## Related Documentation

- [API Documentation](./API.md)
- [Authentication Token Migration](./AUTH_TOKEN_MIGRATION.md)
- [Database Schema](./DATABASE.md)
- [Security Review](./SECURITY_REVIEW.md)
- [Row-Level Security Quick Start](./RLS_QUICK_START.md)
- [Development Guide](./DEVELOPMENT.md)

---

## Changelog

### 2026-02-02
- Initial release of Gym Owner Dashboard
- Added `GET /api/v1/clubs/my-clubs` endpoint
- Created frontend components and Redux state management
- Implemented security measures and RLS policies
- Fixed video fetching issue on dashboard

---

**For additional support or questions, please contact the development team.**
