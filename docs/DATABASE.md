# BoxerConnect Database Schema Documentation

This document describes the database schema for the BoxerConnect platform.

## Overview

BoxerConnect uses **PostgreSQL 15** as its primary database, managed through **Prisma ORM**. The schema is designed to support boxer profiles, match coordination, availability scheduling, and coach-boxer relationships.

## Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│      users       │       │     boxers       │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │───┐   │ id (PK)          │
│ email (UNIQUE)   │   │   │ user_id (FK)     │──┐
│ password_hash    │   └──▶│ name             │  │
│ role             │       │ weight_kg        │  │
│ name             │       │ height_cm        │  │
│ is_active        │       │ date_of_birth    │  │
│ email_verified   │       │ location         │  │
│ last_login_at    │       │ city             │  │
│ created_at       │       │ country          │  │
│ updated_at       │       │ experience_level │  │
└──────────────────┘       │ wins             │  │
         │                 │ losses           │  │
         │                 │ draws            │  │
         │                 │ gym_affiliation  │  │
         │                 │ bio              │  │
         │                 │ profile_photo_url│  │
         │                 │ is_verified      │  │
         │                 │ is_searchable    │  │
         │                 │ created_at       │  │
         │                 │ updated_at       │  │
         │                 └──────────────────┘  │
         │                          │            │
         │         ┌────────────────┼────────────┘
         │         │                │
         │         ▼                ▼
         │  ┌──────────────┐  ┌───────────────────┐
         │  │ fight_history│  │   availability    │
         │  ├──────────────┤  ├───────────────────┤
         │  │ id (PK)      │  │ id (PK)           │
         │  │ boxer_id (FK)│  │ boxer_id (FK)     │
         │  │ opponent_name│  │ date              │
         │  │ date         │  │ start_time        │
         │  │ venue        │  │ end_time          │
         │  │ result       │  │ is_available      │
         │  │ method       │  │ notes             │
         │  │ round        │  │ created_at        │
         │  │ notes        │  │ updated_at        │
         │  │ created_at   │  └───────────────────┘
         │  │ updated_at   │
         │  └──────────────┘
         │
         │                 ┌──────────────────────┐
         │                 │   match_requests     │
         │                 ├──────────────────────┤
         │                 │ id (PK)              │
         │           ┌────▶│ requester_boxer_id(FK)
         │           │     │ target_boxer_id (FK) │◀─┐
         │           │     │ status               │  │
         │           │     │ message              │  │
         │           │     │ response_message     │  │
         │           │     │ proposed_date        │  │
         │           │     │ proposed_venue       │  │
         │           │     │ expires_at           │  │
         │           │     │ created_at           │  │
         │           │     │ updated_at           │  │
         │           │     └──────────────────────┘  │
         │           │                              │
         │           └───────── boxers ─────────────┘
         │
         │
         │  ┌────────────────────┐
         │  │    coach_boxer     │
         │  ├────────────────────┤
         │  │ id (PK)            │
         └─▶│ coach_user_id (FK) │
            │ boxer_id (FK)      │◀── boxers
            │ permissions        │
            │ created_at         │
            │ updated_at         │
            │ UNIQUE(coach_user_id, boxer_id)
            └────────────────────┘
```

## Tables

### users

Stores user authentication and account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid() | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt password hash |
| role | ENUM | NOT NULL, DEFAULT 'BOXER' | User role (BOXER, COACH, GYM_OWNER, ADMIN) |
| name | VARCHAR(100) | NOT NULL | Display name |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Account active status |
| email_verified | BOOLEAN | NOT NULL, DEFAULT false | Email verification status |
| last_login_at | TIMESTAMP | NULLABLE | Last login timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Last update timestamp |

**Indexes:**
- `idx_users_email` - Index on email for login lookups
- `idx_users_role` - Index on role for filtering
- `idx_users_is_active` - Index on is_active for filtering active users

---

### boxers

Stores boxer profile information. Each boxer is linked to a user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid() | Unique identifier |
| user_id | UUID | FK (users.id), UNIQUE, NOT NULL | Reference to user |
| name | VARCHAR(100) | NOT NULL | Boxer's display name |
| weight_kg | DECIMAL(5,2) | NULLABLE | Weight in kilograms |
| height_cm | INT | NULLABLE | Height in centimeters |
| date_of_birth | DATE | NULLABLE | Date of birth |
| location | VARCHAR(255) | NULLABLE | General location/address |
| city | VARCHAR(100) | NULLABLE | City name |
| country | VARCHAR(100) | NULLABLE | Country name |
| experience_level | ENUM | NOT NULL, DEFAULT 'BEGINNER' | Experience level |
| wins | INT | NOT NULL, DEFAULT 0 | Number of wins |
| losses | INT | NOT NULL, DEFAULT 0 | Number of losses |
| draws | INT | NOT NULL, DEFAULT 0 | Number of draws |
| gym_affiliation | VARCHAR(200) | NULLABLE | Current gym name |
| bio | TEXT | NULLABLE | Profile biography |
| profile_photo_url | VARCHAR(500) | NULLABLE | Profile photo URL |
| is_verified | BOOLEAN | NOT NULL, DEFAULT false | Admin verification status |
| is_searchable | BOOLEAN | NOT NULL, DEFAULT true | Visible in search results |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Last update timestamp |

**Indexes:**
- `idx_boxers_user_id` - Index on user_id for user lookup
- `idx_boxers_city_country` - Composite index for location-based search
- `idx_boxers_experience_level` - Index on experience level for filtering
- `idx_boxers_weight_kg` - Index on weight for weight class filtering
- `idx_boxers_is_searchable_is_verified` - Composite index for search visibility

---

### fight_history

Stores historical fight records for boxers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid() | Unique identifier |
| boxer_id | UUID | FK (boxers.id), NOT NULL | Reference to boxer |
| opponent_name | VARCHAR(100) | NOT NULL | Opponent's name |
| date | DATE | NOT NULL | Fight date |
| venue | VARCHAR(200) | NULLABLE | Fight venue |
| result | ENUM | NOT NULL | WIN, LOSS, DRAW, NO_CONTEST |
| method | ENUM | NULLABLE | How fight ended |
| round | INT | NULLABLE | Round fight ended (if applicable) |
| notes | TEXT | NULLABLE | Additional notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Last update timestamp |

**Fight Methods:**
- DECISION - Standard decision
- UNANIMOUS_DECISION - All judges agree
- SPLIT_DECISION - Judges split
- MAJORITY_DECISION - Majority of judges
- KO - Knockout
- TKO - Technical knockout
- RTD - Retired/corner stoppage
- DQ - Disqualification
- NO_CONTEST - No contest declared

**Indexes:**
- `idx_fight_history_boxer_id` - Index for boxer's fight history
- `idx_fight_history_date` - Index for chronological ordering
- `idx_fight_history_result` - Index for filtering by result

---

### availability

Stores boxer availability schedules for sparring.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid() | Unique identifier |
| boxer_id | UUID | FK (boxers.id), NOT NULL | Reference to boxer |
| date | DATE | NOT NULL | Availability date |
| start_time | TIME | NOT NULL | Start time |
| end_time | TIME | NOT NULL | End time |
| is_available | BOOLEAN | NOT NULL, DEFAULT true | Whether slot is available |
| notes | VARCHAR(500) | NULLABLE | Additional notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Last update timestamp |

**Indexes:**
- `idx_availability_boxer_id` - Index for boxer's availability
- `idx_availability_date` - Index for date-based queries
- `idx_availability_is_available_date` - Composite index for finding available slots

---

### match_requests

Stores sparring match requests between boxers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid() | Unique identifier |
| requester_boxer_id | UUID | FK (boxers.id), NOT NULL | Boxer sending request |
| target_boxer_id | UUID | FK (boxers.id), NOT NULL | Boxer receiving request |
| status | ENUM | NOT NULL, DEFAULT 'PENDING' | Request status |
| message | TEXT | NULLABLE | Message from requester |
| response_message | TEXT | NULLABLE | Response from target |
| proposed_date | TIMESTAMP | NULLABLE | Proposed match date |
| proposed_venue | VARCHAR(200) | NULLABLE | Proposed venue |
| expires_at | TIMESTAMP | NOT NULL | Request expiration time |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Last update timestamp |

**Status Values:**
- PENDING - Awaiting response
- ACCEPTED - Request accepted
- DECLINED - Request declined
- EXPIRED - Expired without response
- CANCELLED - Cancelled by requester
- COMPLETED - Match completed

**Indexes:**
- `idx_match_requests_requester_boxer_id` - Index for outgoing requests
- `idx_match_requests_target_boxer_id` - Index for incoming requests
- `idx_match_requests_status` - Index for status filtering
- `idx_match_requests_expires_at` - Index for expiration processing
- `idx_match_requests_status_expires_at` - Composite index for active requests

---

### coach_boxer

Junction table linking coaches to the boxers they manage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid() | Unique identifier |
| coach_user_id | UUID | FK (users.id), NOT NULL | Reference to coach user |
| boxer_id | UUID | FK (boxers.id), NOT NULL | Reference to boxer |
| permissions | ENUM | NOT NULL, DEFAULT 'VIEW_PROFILE' | Coach permission level |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, AUTO | Last update timestamp |

**Permission Levels:**
- VIEW_PROFILE - Can view boxer's profile
- EDIT_PROFILE - Can edit boxer's profile
- MANAGE_AVAILABILITY - Can manage boxer's availability
- RESPOND_TO_MATCHES - Can respond to match requests
- FULL_ACCESS - All permissions

**Constraints:**
- UNIQUE(coach_user_id, boxer_id) - Each coach-boxer pair is unique

**Indexes:**
- `idx_coach_boxer_coach_user_id` - Index for coach's boxers
- `idx_coach_boxer_boxer_id` - Index for boxer's coaches

---

## Enumerations

### UserRole

```sql
CREATE TYPE user_role AS ENUM (
  'BOXER',
  'COACH',
  'GYM_OWNER',
  'ADMIN'
);
```

### ExperienceLevel

```sql
CREATE TYPE experience_level AS ENUM (
  'BEGINNER',      -- 0-1 years, 0-5 fights
  'AMATEUR',       -- 1-3 years, 5-15 fights
  'INTERMEDIATE',  -- 3-5 years, 15-30 fights
  'ADVANCED',      -- 5-10 years, 30-50 fights
  'PROFESSIONAL'   -- 10+ years or pro license
);
```

### FightResult

```sql
CREATE TYPE fight_result AS ENUM (
  'WIN',
  'LOSS',
  'DRAW',
  'NO_CONTEST'
);
```

### FightMethod

```sql
CREATE TYPE fight_method AS ENUM (
  'DECISION',
  'UNANIMOUS_DECISION',
  'SPLIT_DECISION',
  'MAJORITY_DECISION',
  'KO',
  'TKO',
  'RTD',
  'DQ',
  'NO_CONTEST'
);
```

### MatchRequestStatus

```sql
CREATE TYPE match_request_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
  'COMPLETED'
);
```

### CoachPermission

```sql
CREATE TYPE coach_permission AS ENUM (
  'VIEW_PROFILE',
  'EDIT_PROFILE',
  'MANAGE_AVAILABILITY',
  'RESPOND_TO_MATCHES',
  'FULL_ACCESS'
);
```

---

## Relationships

### One-to-One

| Parent | Child | Foreign Key |
|--------|-------|-------------|
| users | boxers | boxers.user_id -> users.id |

### One-to-Many

| Parent | Child | Foreign Key |
|--------|-------|-------------|
| boxers | fight_history | fight_history.boxer_id -> boxers.id |
| boxers | availability | availability.boxer_id -> boxers.id |
| boxers | match_requests (sent) | match_requests.requester_boxer_id -> boxers.id |
| boxers | match_requests (received) | match_requests.target_boxer_id -> boxers.id |

### Many-to-Many

| Table A | Junction Table | Table B | Description |
|---------|----------------|---------|-------------|
| users (coaches) | coach_boxer | boxers | Coaches managing boxers |

---

## Cascade Behavior

All foreign key relationships use `ON DELETE CASCADE`:

- Deleting a **user** deletes their **boxer** profile
- Deleting a **boxer** deletes their:
  - Fight history records
  - Availability records
  - Sent match requests
  - Received match requests
  - Coach associations

---

## Database Migrations

Migrations are managed by Prisma. Key commands:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and apply new migration (development)
npm run prisma:migrate

# Apply migrations (production)
npm run prisma:migrate:prod

# Reset database (development only)
npm run db:reset

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

---

## Performance Considerations

### Indexing Strategy

The schema includes indexes optimized for:

1. **Authentication**: Fast user lookup by email
2. **Search**: Efficient boxer search by location, experience, weight
3. **Match Requests**: Quick retrieval of incoming/outgoing requests
4. **Availability**: Date-based availability lookups

### Query Optimization Tips

1. **Boxer Search**: Use the composite index on (city, country) for location-based queries
2. **Match Requests**: Filter by status first, then by boxer ID
3. **Availability**: Query by (boxer_id, date) for best performance
4. **Pagination**: Always use LIMIT/OFFSET with appropriate indexes

### Recommended Practices

1. Use database connection pooling (Prisma handles this automatically)
2. Implement query result caching with Redis for frequently accessed data
3. Use database transactions for operations that modify multiple tables
4. Monitor slow queries and add indexes as needed
