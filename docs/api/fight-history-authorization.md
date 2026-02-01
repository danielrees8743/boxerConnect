# Fight History Authorization

API documentation for fight history management with role-based access control.

## Table of Contents

- [Overview](#overview)
- [Authorization Model](#authorization-model)
  - [Role Permissions](#role-permissions)
  - [Permission Matrix](#permission-matrix)
- [Endpoints](#endpoints)
  - [Read Fight History (Own)](#read-fight-history-own)
  - [Read Fight History (Any Boxer)](#read-fight-history-any-boxer)
  - [Create Fight Record](#create-fight-record)
  - [Update Fight Record](#update-fight-record)
  - [Delete Fight Record](#delete-fight-record)
- [Deprecated Endpoints](#deprecated-endpoints)
- [Error Responses](#error-responses)
- [Migration Guide](#migration-guide)

---

## Overview

Fight history management follows a delegated authorization model where boxers have read-only access to their own fight records, while coaches and gym owners manage fight data on their behalf.

### Key Changes

- **Boxers**: Read-only access to their own fight history
- **Coaches**: Can manage fights for linked boxers (requires specific permission)
- **Gym Owners**: Can manage fights for all boxers in their club
- **Admins**: Full access to manage any boxer's fights

### Rationale

This authorization model ensures:

1. **Data Integrity**: Fight records are verified by authorized personnel
2. **Accountability**: Changes are traceable to coaches/gym staff
3. **Accuracy**: Professional oversight prevents self-reported inaccuracies

---

## Authorization Model

### Role Permissions

#### Boxer

| Action | Allowed |
|--------|---------|
| Read own fight history | Yes |
| Read other boxer's fight history | Yes (public data) |
| Create fight record | No |
| Update fight record | No |
| Delete fight record | No |

#### Coach

Coaches can manage fight history for boxers they are linked to, provided they have the appropriate permission.

| Permission Required | Description |
|---------------------|-------------|
| `MANAGE_FIGHT_HISTORY` | Allows creating, updating, and deleting fight records |
| `FULL_ACCESS` | Includes all permissions including fight history management |

**Requirements for coach access:**

1. Active coach-boxer link exists
2. Coach has `MANAGE_FIGHT_HISTORY` or `FULL_ACCESS` permission on that link

#### Gym Owner

Gym owners can manage fight history for any boxer registered to their club.

| Action | Allowed |
|--------|---------|
| Read fight history | Yes (all boxers in club) |
| Create fight record | Yes (boxers in their club) |
| Update fight record | Yes (boxers in their club) |
| Delete fight record | Yes (boxers in their club) |

#### Admin

Administrators have unrestricted access to all fight history operations.

| Action | Allowed |
|--------|---------|
| Read fight history | Yes (all boxers) |
| Create fight record | Yes (any boxer) |
| Update fight record | Yes (any boxer) |
| Delete fight record | Yes (any boxer) |

### Permission Matrix

| Action | Boxer | Coach (with permission) | Gym Owner | Admin |
|--------|-------|-------------------------|-----------|-------|
| `GET /boxers/me/fights` | Yes | - | - | - |
| `GET /boxers/:id/fights` | Yes | Yes | Yes | Yes |
| `POST /boxers/:boxerId/fights` | No | Linked boxers only | Club boxers only | Yes |
| `PUT /boxers/:boxerId/fights/:fightId` | No | Linked boxers only | Club boxers only | Yes |
| `DELETE /boxers/:boxerId/fights/:fightId` | No | Linked boxers only | Club boxers only | Yes |

---

## Endpoints

### Read Fight History (Own)

Retrieve the authenticated boxer's own fight history.

**Endpoint:** `GET /api/v1/boxers/me/fights`

**Authentication:** Required (Bearer token)

**Authorization:** BOXER role required

**Rate Limit:** Standard (100 requests per 15 minutes)

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Results per page (default: 20, max: 100) |
| sort | string | No | Sort field (default: `-date`) |

#### Example Request

Using curl:

```bash
curl -X GET "http://localhost:3001/api/v1/boxers/me/fights?page=1&limit=10" \
  -H "Authorization: Bearer <access_token>"
```

Using JavaScript (fetch):

```javascript
const response = await fetch('/api/v1/boxers/me/fights?page=1&limit=10', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
```

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2024-03-15",
      "opponent": "John Smith",
      "opponentRecord": "12-3-0",
      "venue": "Madison Square Garden",
      "location": "New York, NY",
      "result": "WIN",
      "method": "KO",
      "round": 5,
      "weightClass": "WELTERWEIGHT",
      "notes": "Title defense",
      "createdAt": "2024-03-16T10:00:00.000Z",
      "updatedAt": "2024-03-16T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### Read Fight History (Any Boxer)

Retrieve the fight history for any boxer by their ID. This endpoint returns public fight data.

**Endpoint:** `GET /api/v1/boxers/:id/fights`

**Authentication:** Optional (enhanced data with authentication)

**Authorization:** None (public endpoint)

**Rate Limit:** Standard (100 requests per 15 minutes)

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Boxer's unique identifier |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Results per page (default: 20, max: 100) |
| sort | string | No | Sort field (default: `-date`) |

#### Example Request

```bash
curl -X GET "http://localhost:3001/api/v1/boxers/550e8400-e29b-41d4-a716-446655440000/fights"
```

#### Success Response

**Status:** `200 OK`

Response format is identical to [Read Fight History (Own)](#read-fight-history-own).

---

### Create Fight Record

Create a new fight record for a boxer. Only authorized coaches, gym owners, or admins can perform this action.

**Endpoint:** `POST /api/v1/boxers/:boxerId/fights`

**Authentication:** Required (Bearer token)

**Authorization:**
- Coach with `MANAGE_FIGHT_HISTORY` or `FULL_ACCESS` permission (linked boxers only)
- Gym Owner (club boxers only)
- Admin (any boxer)

**Rate Limit:** Create Resource (30 requests per hour)

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| boxerId | UUID | Yes | Target boxer's unique identifier |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| date | string (ISO date) | Yes | Date of the fight (YYYY-MM-DD) |
| opponent | string | Yes | Opponent's name |
| opponentRecord | string | No | Opponent's record at time of fight (e.g., "12-3-0") |
| venue | string | No | Venue name |
| location | string | No | City/location of the fight |
| result | enum | Yes | Fight result: `WIN`, `LOSS`, `DRAW`, `NO_CONTEST` |
| method | enum | No | Victory/loss method: `KO`, `TKO`, `DECISION`, `SPLIT_DECISION`, `UNANIMOUS_DECISION`, `DQ`, `SUBMISSION` |
| round | number | No | Round in which fight ended (1-12) |
| weightClass | enum | Yes | Weight class for the fight |
| notes | string | No | Additional notes (max 500 characters) |

#### Example Request

Using curl:

```bash
curl -X POST "http://localhost:3001/api/v1/boxers/550e8400-e29b-41d4-a716-446655440000/fights" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-03-15",
    "opponent": "John Smith",
    "opponentRecord": "12-3-0",
    "venue": "Madison Square Garden",
    "location": "New York, NY",
    "result": "WIN",
    "method": "KO",
    "round": 5,
    "weightClass": "WELTERWEIGHT",
    "notes": "Title defense"
  }'
```

Using JavaScript (fetch):

```javascript
const response = await fetch('/api/v1/boxers/550e8400-e29b-41d4-a716-446655440000/fights', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    date: '2024-03-15',
    opponent: 'John Smith',
    opponentRecord: '12-3-0',
    venue: 'Madison Square Garden',
    location: 'New York, NY',
    result: 'WIN',
    method: 'KO',
    round: 5,
    weightClass: 'WELTERWEIGHT',
    notes: 'Title defense',
  }),
});
```

#### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "boxerId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-03-15",
    "opponent": "John Smith",
    "opponentRecord": "12-3-0",
    "venue": "Madison Square Garden",
    "location": "New York, NY",
    "result": "WIN",
    "method": "KO",
    "round": 5,
    "weightClass": "WELTERWEIGHT",
    "notes": "Title defense",
    "createdBy": "770e8400-e29b-41d4-a716-446655440002",
    "createdAt": "2024-03-16T10:00:00.000Z",
    "updatedAt": "2024-03-16T10:00:00.000Z"
  },
  "message": "Fight record created successfully"
}
```

---

### Update Fight Record

Update an existing fight record. Only authorized coaches, gym owners, or admins can perform this action.

**Endpoint:** `PUT /api/v1/boxers/:boxerId/fights/:fightId`

**Authentication:** Required (Bearer token)

**Authorization:**
- Coach with `MANAGE_FIGHT_HISTORY` or `FULL_ACCESS` permission (linked boxers only)
- Gym Owner (club boxers only)
- Admin (any boxer)

**Rate Limit:** Standard (100 requests per 15 minutes)

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| boxerId | UUID | Yes | Target boxer's unique identifier |
| fightId | UUID | Yes | Fight record's unique identifier |

#### Request Body

All fields are optional. Only provided fields will be updated.

| Field | Type | Description |
|-------|------|-------------|
| date | string (ISO date) | Date of the fight (YYYY-MM-DD) |
| opponent | string | Opponent's name |
| opponentRecord | string | Opponent's record at time of fight |
| venue | string | Venue name |
| location | string | City/location of the fight |
| result | enum | Fight result |
| method | enum | Victory/loss method |
| round | number | Round in which fight ended |
| weightClass | enum | Weight class for the fight |
| notes | string | Additional notes (max 500 characters) |

#### Example Request

```bash
curl -X PUT "http://localhost:3001/api/v1/boxers/550e8400-e29b-41d4-a716-446655440000/fights/660e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "WBC Title defense - Retained championship"
  }'
```

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "boxerId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-03-15",
    "opponent": "John Smith",
    "opponentRecord": "12-3-0",
    "venue": "Madison Square Garden",
    "location": "New York, NY",
    "result": "WIN",
    "method": "KO",
    "round": 5,
    "weightClass": "WELTERWEIGHT",
    "notes": "WBC Title defense - Retained championship",
    "createdBy": "770e8400-e29b-41d4-a716-446655440002",
    "updatedBy": "770e8400-e29b-41d4-a716-446655440002",
    "createdAt": "2024-03-16T10:00:00.000Z",
    "updatedAt": "2024-03-17T14:30:00.000Z"
  },
  "message": "Fight record updated successfully"
}
```

---

### Delete Fight Record

Delete an existing fight record. Only authorized coaches, gym owners, or admins can perform this action.

**Endpoint:** `DELETE /api/v1/boxers/:boxerId/fights/:fightId`

**Authentication:** Required (Bearer token)

**Authorization:**
- Coach with `MANAGE_FIGHT_HISTORY` or `FULL_ACCESS` permission (linked boxers only)
- Gym Owner (club boxers only)
- Admin (any boxer)

**Rate Limit:** Standard (100 requests per 15 minutes)

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| boxerId | UUID | Yes | Target boxer's unique identifier |
| fightId | UUID | Yes | Fight record's unique identifier |

#### Example Request

```bash
curl -X DELETE "http://localhost:3001/api/v1/boxers/550e8400-e29b-41d4-a716-446655440000/fights/660e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer <access_token>"
```

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": null,
  "message": "Fight record deleted successfully"
}
```

---

## Deprecated Endpoints

The following endpoints have been deprecated and will return `403 Forbidden`. Boxers can no longer manage their own fight history directly.

### POST /api/v1/boxers/me/fights

**Status:** Deprecated

**Response:** `403 Forbidden`

```json
{
  "success": false,
  "error": "Boxers cannot create their own fight records. Please contact your coach or gym administrator."
}
```

### PUT /api/v1/boxers/me/fights/:id

**Status:** Deprecated

**Response:** `403 Forbidden`

```json
{
  "success": false,
  "error": "Boxers cannot update their own fight records. Please contact your coach or gym administrator."
}
```

### DELETE /api/v1/boxers/me/fights/:id

**Status:** Deprecated

**Response:** `403 Forbidden`

```json
{
  "success": false,
  "error": "Boxers cannot delete their own fight records. Please contact your coach or gym administrator."
}
```

---

## Error Responses

### 400 Bad Request

**Invalid request body:**

```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    {
      "field": "date",
      "message": "Date is required"
    },
    {
      "field": "result",
      "message": "Result must be one of: WIN, LOSS, DRAW, NO_CONTEST"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "No token provided"
}
```

Or:

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### 403 Forbidden

**Insufficient permissions (coach without required permission):**

```json
{
  "success": false,
  "error": "You do not have permission to manage fight history for this boxer. Required permission: MANAGE_FIGHT_HISTORY or FULL_ACCESS"
}
```

**No coach-boxer link:**

```json
{
  "success": false,
  "error": "You are not linked to this boxer"
}
```

**Boxer not in gym owner's club:**

```json
{
  "success": false,
  "error": "This boxer is not registered to your club"
}
```

**Boxer attempting self-management:**

```json
{
  "success": false,
  "error": "Boxers cannot manage their own fight records. Please contact your coach or gym administrator."
}
```

### 404 Not Found

**Boxer not found:**

```json
{
  "success": false,
  "error": "Boxer not found"
}
```

**Fight record not found:**

```json
{
  "success": false,
  "error": "Fight record not found"
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

---

## Migration Guide

### For Boxers

If you previously managed your own fight history:

1. **Contact your coach**: Ask your coach to link with you if not already linked
2. **Request permission**: Ensure your coach has `MANAGE_FIGHT_HISTORY` permission
3. **Provide fight details**: Share fight information with your coach for entry

### For Coaches

To manage fight history for your boxers:

1. **Verify link**: Ensure you have an active link with the boxer
2. **Check permissions**: Confirm you have `MANAGE_FIGHT_HISTORY` or `FULL_ACCESS` permission
3. **Use new endpoints**: Use `POST/PUT/DELETE /api/v1/boxers/:boxerId/fights` endpoints

### For Gym Owners

You can manage fight history for any boxer in your club:

1. **Verify membership**: Ensure the boxer is registered to your club
2. **Use new endpoints**: Use `POST/PUT/DELETE /api/v1/boxers/:boxerId/fights` endpoints

### For Developers

Update your client applications:

1. **Remove self-management UI**: Hide create/edit/delete buttons for boxers viewing their own profile
2. **Update API calls**: Use new endpoint structure for fight management
3. **Handle 403 errors**: Display appropriate messages when boxers attempt self-management
4. **Add role checks**: Show management UI only for authorized users (coaches, gym owners, admins)

---

## Related Documentation

- [Boxer Endpoints](../API.md#boxer-endpoints) - Main boxer profile API documentation
- [Coach Endpoints](../API.md#coach-endpoints) - Coach management and linking
- [Authentication](../API.md#authentication) - Authentication and authorization
