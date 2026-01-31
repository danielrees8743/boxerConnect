# BoxerConnect API Documentation

Complete API reference for the BoxerConnect platform.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Auth](#auth-endpoints)
  - [Boxers](#boxer-endpoints)
  - [Match Requests](#match-request-endpoints)
  - [Availability](#availability-endpoints)
  - [Coach](#coach-endpoints)
  - [Admin](#admin-endpoints)

---

## Overview

### Base URL

```
Development: http://localhost:3001/api/v1
Production:  https://api.boxerconnect.com/api/v1
```

### API Versioning

The API version is included in the URL path (`/api/v1`). Major version changes may introduce breaking changes.

### Content Type

All requests and responses use JSON format:

```
Content-Type: application/json
```

### Standard Response Format

#### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Error message description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

---

## Authentication

BoxerConnect uses JWT (JSON Web Token) authentication with access and refresh tokens.

### Token Types

| Token | Purpose | Default Expiry |
|-------|---------|----------------|
| Access Token | API authentication | 15 minutes |
| Refresh Token | Obtain new access tokens | 7 days |

### Using Authentication

Include the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Refresh Flow

1. Access token expires
2. Client sends refresh token to `/auth/refresh`
3. Server returns new access and refresh tokens
4. Client updates stored tokens

---

## Rate Limiting

Rate limits protect the API from abuse. Limits are enforced per IP address.

| Limiter | Window | Max Requests | Applies To |
|---------|--------|--------------|------------|
| Standard | 15 minutes | 100 | Most endpoints |
| Strict | 15 minutes | 10 | Registration, token refresh |
| Auth | 1 hour | 5 | Login (failed attempts) |
| Password Reset | 1 hour | 3 | Password reset requests |
| Create Resource | 1 hour | 30 | Creating match requests, etc. |
| Search | 1 minute | 60 | Search and listing endpoints |

### Rate Limit Headers

Responses include rate limit information:

```
RateLimit-Limit: 100
RateLimit-Remaining: 99
RateLimit-Reset: 1640000000
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Validation Errors

Validation errors return field-specific messages:

```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

---

## Endpoints

### Health Check Endpoints

These endpoints do not require authentication.

#### GET /health

Basic health check for load balancers.

**Response:**

```json
{
  "success": true,
  "data": { "status": "ok" },
  "message": "Service is healthy"
}
```

#### GET /health/detailed

Detailed health check including service dependencies.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 86400,
    "version": "1.0.0",
    "services": {
      "database": { "status": "up", "latency": 5 },
      "redis": { "status": "up", "latency": 2 }
    }
  }
}
```

#### GET /ready

Readiness check for kubernetes probes.

**Response:**

```json
{
  "success": true,
  "data": { "ready": true },
  "message": "Service is ready"
}
```

---

### Auth Endpoints

Base path: `/api/v1/auth`

#### POST /auth/register

Register a new user account.

**Rate Limit:** Strict (10 requests per 15 minutes)

**Request Body:**

```json
{
  "email": "boxer@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "role": "BOXER"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email, max 255 chars |
| password | string | Yes | Min 8 chars, must contain uppercase, lowercase, and number |
| name | string | Yes | 2-100 characters |
| role | enum | No | BOXER (default), COACH, GYM_OWNER |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "boxer@example.com",
      "name": "John Doe",
      "role": "BOXER",
      "isActive": true,
      "emailVerified": false,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  },
  "message": "Registration successful"
}
```

---

#### POST /auth/login

Authenticate and receive tokens.

**Rate Limit:** Auth (5 failed attempts per hour)

**Request Body:**

```json
{
  "email": "boxer@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "boxer@example.com",
      "name": "John Doe",
      "role": "BOXER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Login successful"
}
```

---

#### POST /auth/refresh

Refresh access token using refresh token.

**Rate Limit:** Strict (10 requests per 15 minutes)

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Token refreshed successfully"
}
```

---

#### GET /auth/me

Get current authenticated user.

**Authentication:** Required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "boxer@example.com",
      "name": "John Doe",
      "role": "BOXER",
      "isActive": true,
      "emailVerified": true,
      "lastLoginAt": "2024-01-15T10:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "User retrieved successfully"
}
```

---

#### POST /auth/logout

Logout and invalidate refresh token.

**Authentication:** Required

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

---

#### POST /auth/forgot-password

Request password reset email.

**Rate Limit:** Password Reset (3 requests per hour)

**Request Body:**

```json
{
  "email": "boxer@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": null,
  "message": "If an account with that email exists, a password reset link has been sent"
}
```

---

#### POST /auth/reset-password

Reset password with token.

**Rate Limit:** Password Reset (3 requests per hour)

**Request Body:**

```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": null,
  "message": "Password reset successful"
}
```

---

### Boxer Endpoints

Base path: `/api/v1/boxers`

#### GET /boxers

Search boxers with filters.

**Authentication:** Optional (for personalized results)
**Rate Limit:** Search (60 requests per minute)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| city | string | Filter by city |
| country | string | Filter by country |
| experienceLevel | enum | BEGINNER, AMATEUR, INTERMEDIATE, ADVANCED, PROFESSIONAL |
| minWeight | number | Minimum weight in kg |
| maxWeight | number | Maximum weight in kg |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |

**Example:** `GET /boxers?city=London&experienceLevel=INTERMEDIATE&page=1&limit=10`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "weightKg": "75.50",
      "heightCm": 180,
      "city": "London",
      "country": "UK",
      "experienceLevel": "INTERMEDIATE",
      "wins": 15,
      "losses": 3,
      "draws": 2,
      "gymAffiliation": "London Boxing Gym",
      "isVerified": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

#### GET /boxers/me

Get current user's boxer profile.

**Authentication:** Required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "name": "John Doe",
    "weightKg": "75.50",
    "heightCm": 180,
    "dateOfBirth": "1990-05-15",
    "location": "Central London",
    "city": "London",
    "country": "UK",
    "experienceLevel": "INTERMEDIATE",
    "wins": 15,
    "losses": 3,
    "draws": 2,
    "gymAffiliation": "London Boxing Gym",
    "bio": "Amateur boxer looking for sparring partners",
    "profilePhotoUrl": "https://example.com/photo.jpg",
    "isVerified": true,
    "isSearchable": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### POST /boxers

Create or complete boxer profile.

**Authentication:** Required (BOXER role)
**Rate Limit:** Create Resource (30 creates per hour)

**Request Body:**

```json
{
  "name": "John Doe",
  "weightKg": 75.5,
  "heightCm": 180,
  "dateOfBirth": "1990-05-15T00:00:00.000Z",
  "location": "Central London",
  "city": "London",
  "country": "UK",
  "experienceLevel": "INTERMEDIATE",
  "wins": 15,
  "losses": 3,
  "draws": 2,
  "gymAffiliation": "London Boxing Gym",
  "bio": "Amateur boxer looking for sparring partners",
  "profilePhotoUrl": "https://example.com/photo.jpg"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | 2-100 characters |
| weightKg | number | No | 40-200 kg |
| heightCm | integer | No | 120-230 cm |
| dateOfBirth | datetime | No | ISO 8601 format |
| location | string | No | Max 255 characters |
| city | string | No | Max 100 characters |
| country | string | No | Max 100 characters |
| experienceLevel | enum | No | Default: BEGINNER |
| wins | integer | No | Min: 0 |
| losses | integer | No | Min: 0 |
| draws | integer | No | Min: 0 |
| gymAffiliation | string | No | Max 200 characters |
| bio | string | No | Max 2000 characters |
| profilePhotoUrl | string | No | Valid URL, max 500 characters |

**Response (201):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Boxer profile created successfully"
}
```

---

#### GET /boxers/:id

Get boxer by ID.

**Authentication:** Optional

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    ...
  }
}
```

---

#### PUT /boxers/:id

Update boxer profile (owner only).

**Authentication:** Required

**Request Body:** Same as POST (all fields optional)

**Response (200):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Boxer profile updated successfully"
}
```

---

#### DELETE /boxers/:id

Deactivate boxer profile (owner only).

**Authentication:** Required

**Response (200):**

```json
{
  "success": true,
  "data": null,
  "message": "Boxer profile deactivated"
}
```

---

#### GET /boxers/:id/matches

Get compatible matches for a boxer (owner only).

**Authentication:** Required

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "experienceLevel": "INTERMEDIATE",
      "weightKg": "73.00",
      "city": "London",
      "compatibility": 85
    }
  ]
}
```

---

#### GET /boxers/me/suggestions

Get suggested matches for current user.

**Authentication:** Required (BOXER role)

**Response (200):**

```json
{
  "success": true,
  "data": [ ... ]
}
```

---

### Match Request Endpoints

Base path: `/api/v1/match-requests`

All match request endpoints require authentication and BOXER role.

#### GET /match-requests

Get match requests for current user.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | `incoming` or `outgoing` |
| status | enum | PENDING, ACCEPTED, DECLINED, EXPIRED, CANCELLED, COMPLETED |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "requesterBoxerId": "uuid",
      "targetBoxerId": "uuid",
      "status": "PENDING",
      "message": "Would you like to spar?",
      "proposedDate": "2024-02-01T14:00:00.000Z",
      "proposedVenue": "London Boxing Gym",
      "expiresAt": "2024-01-25T00:00:00.000Z",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "requesterBoxer": {
        "id": "uuid",
        "name": "John Doe"
      },
      "targetBoxer": {
        "id": "uuid",
        "name": "Jane Smith"
      }
    }
  ],
  "pagination": { ... }
}
```

---

#### POST /match-requests

Create a new match request.

**Rate Limit:** Create Resource (30 creates per hour)

**Request Body:**

```json
{
  "targetBoxerId": "uuid",
  "message": "Would you like to spar next week?",
  "proposedDate": "2024-02-01T14:00:00.000Z",
  "proposedVenue": "London Boxing Gym"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| targetBoxerId | uuid | Yes | ID of boxer to send request to |
| message | string | No | Message to include with request |
| proposedDate | datetime | No | Proposed date for the match |
| proposedVenue | string | No | Proposed venue (max 200 chars) |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "requesterBoxerId": "uuid",
    "targetBoxerId": "uuid",
    "status": "PENDING",
    "message": "Would you like to spar next week?",
    "proposedDate": "2024-02-01T14:00:00.000Z",
    "proposedVenue": "London Boxing Gym",
    "expiresAt": "2024-01-22T10:00:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "message": "Match request sent successfully"
}
```

---

#### GET /match-requests/:id

Get a specific match request by ID.

**Response (200):**

```json
{
  "success": true,
  "data": { ... }
}
```

---

#### PUT /match-requests/:id/accept

Accept a match request.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ACCEPTED",
    ...
  },
  "message": "Match request accepted"
}
```

---

#### PUT /match-requests/:id/decline

Decline a match request.

**Request Body (optional):**

```json
{
  "responseMessage": "Sorry, I'm not available that week."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "DECLINED",
    "responseMessage": "Sorry, I'm not available that week.",
    ...
  },
  "message": "Match request declined"
}
```

---

#### DELETE /match-requests/:id

Cancel a match request (requester only).

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CANCELLED",
    ...
  },
  "message": "Match request cancelled"
}
```

---

#### GET /match-requests/stats

Get match request statistics for current user.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "sent": {
      "total": 10,
      "pending": 3,
      "accepted": 5,
      "declined": 2
    },
    "received": {
      "total": 8,
      "pending": 2,
      "accepted": 4,
      "declined": 2
    }
  }
}
```

---

### Availability Endpoints

Base path: `/api/v1/availability` and `/api/v1/boxers/:boxerId/availability`

#### GET /availability/me

Get current user's boxer availability.

**Authentication:** Required

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "boxerId": "uuid",
      "date": "2024-02-01",
      "startTime": "09:00:00",
      "endTime": "12:00:00",
      "isAvailable": true,
      "notes": "Available for sparring"
    }
  ]
}
```

---

#### POST /boxers/:boxerId/availability

Create availability slot for a boxer.

**Authentication:** Required (owner only)
**Rate Limit:** Create Resource

**Request Body:**

```json
{
  "date": "2024-02-01",
  "startTime": "09:00:00",
  "endTime": "12:00:00",
  "isAvailable": true,
  "notes": "Available for sparring"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Availability created successfully"
}
```

---

#### GET /boxers/:boxerId/availability

Get availability for a boxer.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Filter from date |
| endDate | date | Filter to date |

**Response (200):**

```json
{
  "success": true,
  "data": [ ... ]
}
```

---

#### PUT /boxers/:boxerId/availability/:id

Update availability slot.

**Authentication:** Required (owner only)

**Request Body:** Same fields as POST (all optional)

**Response (200):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Availability updated successfully"
}
```

---

#### DELETE /boxers/:boxerId/availability/:id

Delete availability slot.

**Authentication:** Required (owner only)

**Response (200):**

```json
{
  "success": true,
  "data": null,
  "message": "Availability deleted successfully"
}
```

---

### Coach Endpoints

Base path: `/api/v1/coach`

All coach endpoints require authentication and COACH role.

#### GET /coach/boxers

Get all boxers linked to the authenticated coach.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "boxer": {
        "id": "uuid",
        "name": "John Doe",
        "experienceLevel": "INTERMEDIATE"
      },
      "permissions": "VIEW_PROFILE",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

#### POST /coach/boxers/:boxerId/link

Link a boxer to the authenticated coach.

**Rate Limit:** Create Resource

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "coachUserId": "uuid",
    "boxerId": "uuid",
    "permissions": "VIEW_PROFILE"
  },
  "message": "Boxer linked successfully"
}
```

---

#### DELETE /coach/boxers/:boxerId/unlink

Unlink a boxer from the authenticated coach.

**Response (200):**

```json
{
  "success": true,
  "data": null,
  "message": "Boxer unlinked successfully"
}
```

---

#### PUT /coach/boxers/:boxerId/permissions

Update permissions for a linked boxer.

**Request Body:**

```json
{
  "permissions": "MANAGE_AVAILABILITY"
}
```

| Permission | Description |
|------------|-------------|
| VIEW_PROFILE | View boxer's profile |
| EDIT_PROFILE | Edit boxer's profile |
| MANAGE_AVAILABILITY | Manage boxer's availability |
| RESPOND_TO_MATCHES | Respond to match requests |
| FULL_ACCESS | All permissions |

**Response (200):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Permissions updated successfully"
}
```

---

### Admin Endpoints

Base path: `/api/v1/admin`

All admin endpoints require authentication and ADMIN role.

#### GET /admin/users

Get all users with optional filtering and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| role | enum | Filter by role (BOXER, COACH, GYM_OWNER, ADMIN) |
| isActive | boolean | Filter by active status |
| page | number | Page number |
| limit | number | Items per page |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "BOXER",
      "isActive": true,
      "emailVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### PUT /admin/users/:id/status

Activate or deactivate a user.

**Request Body:**

```json
{
  "isActive": false
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { ... },
  "message": "User status updated"
}
```

---

#### GET /admin/boxers/pending-verification

Get boxers pending verification.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "isVerified": false,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### PUT /admin/boxers/:id/verify

Verify or unverify a boxer.

**Request Body:**

```json
{
  "isVerified": true
}
```

**Response (200):**

```json
{
  "success": true,
  "data": { ... },
  "message": "Boxer verification status updated"
}
```

---

#### GET /admin/stats

Get system-wide statistics.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1000,
      "active": 950,
      "byRole": {
        "BOXER": 800,
        "COACH": 150,
        "GYM_OWNER": 45,
        "ADMIN": 5
      }
    },
    "boxers": {
      "total": 800,
      "verified": 650,
      "searchable": 780
    },
    "matchRequests": {
      "total": 5000,
      "pending": 200,
      "accepted": 3500,
      "declined": 1000,
      "completed": 300
    }
  }
}
```

---

## Enums Reference

### UserRole

| Value | Description |
|-------|-------------|
| BOXER | Standard boxer user |
| COACH | Coach who manages boxers |
| GYM_OWNER | Gym owner |
| ADMIN | System administrator |

### ExperienceLevel

| Value | Description |
|-------|-------------|
| BEGINNER | 0-1 years, 0-5 fights |
| AMATEUR | 1-3 years, 5-15 fights |
| INTERMEDIATE | 3-5 years, 15-30 fights |
| ADVANCED | 5-10 years, 30-50 fights |
| PROFESSIONAL | 10+ years or pro license |

### MatchRequestStatus

| Value | Description |
|-------|-------------|
| PENDING | Awaiting response |
| ACCEPTED | Request accepted |
| DECLINED | Request declined |
| EXPIRED | Request expired without response |
| CANCELLED | Cancelled by requester |
| COMPLETED | Match completed |

### CoachPermission

| Value | Description |
|-------|-------------|
| VIEW_PROFILE | View boxer's profile |
| EDIT_PROFILE | Edit boxer's profile |
| MANAGE_AVAILABILITY | Manage availability |
| RESPOND_TO_MATCHES | Respond to match requests |
| FULL_ACCESS | All permissions |
