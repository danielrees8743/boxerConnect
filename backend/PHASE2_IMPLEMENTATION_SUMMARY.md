# Phase 2: Flow A Backend - Direct Account Creation

## Implementation Summary

This document summarizes the implementation of Phase 2: Flow A Backend, which enables gym owners to directly create boxer accounts linked to their clubs.

## Files Created

### 1. Validators (`backend/src/validators/gymOwner.validators.ts`)
- **Purpose**: Zod validation schema for gym owner operations
- **Schema**: `createBoxerAccountSchema`
  - Required fields: email, password, name
  - Optional fields: experienceLevel, gender, weightKg, heightCm, dateOfBirth, city, country
  - Password requirements: min 8 chars, must contain uppercase, lowercase, and number
  - Email validation: valid format, max 255 chars, auto-lowercase
  - Name validation: 2-100 chars, trimmed
  - Weight validation: 40-200 kg
  - Height validation: 120-230 cm (integer)
  - Date of birth: must be in the past

### 2. Service (`backend/src/services/gymOwner.service.ts`)
- **Purpose**: Business logic for gym owner operations
- **Method**: `createBoxerAccountForClub(gymOwnerUserId, clubId, data)`
  - Verifies gym owner owns the specified club
  - Validates email doesn't already exist
  - Hashes password using bcrypt (BCRYPT_COST = 12)
  - Creates user account with role BOXER in a transaction
  - Creates boxer profile linked to the user and club
  - Sets boxer.clubId to the club
  - Syncs gymAffiliation field with club name
  - Uses `withUserContext` for RLS context setting
  - Returns both user and boxer objects
  - Error handling for:
    - Unauthorized club access
    - Duplicate email
    - Club not found

### 3. Controller (`backend/src/controllers/gymOwner.controller.ts`)
- **Purpose**: HTTP request handling for gym owner endpoints
- **Method**: `createBoxerAccount(req, res, next)`
  - Validates request with `createBoxerAccountSchema`
  - Extracts clubId from req.params
  - Calls `gymOwner.service.createBoxerAccountForClub()`
  - Returns 201 Created with user and boxer data
  - Handles errors appropriately:
    - 403 Forbidden: Not authorized for club
    - 400 Bad Request: Duplicate email or club not found

### 4. Routes (`backend/src/routes/gymOwner.routes.ts`)
- **Purpose**: API route definitions
- **Route**: `POST /api/v1/gym-owner/clubs/:clubId/boxers/create-account`
  - Middleware chain:
    - `createResourceLimiter` - Rate limiting for resource creation
    - `authenticate` - User authentication
    - `requirePermission(Permission.GYM_OWNER_CREATE_BOXER_ACCOUNT)` - Permission check
  - Handler: `createBoxerAccount` controller

### 5. Routes Registration (`backend/src/routes/index.ts`)
- **Updated**: Added gym owner routes to main router
- **Path**: `/api/v1/gym-owner`

## Tests Created

### 1. Service Tests (`backend/tests/services/gymOwner.service.test.ts`)
- **Coverage**: 96.42% statements, 95% branches, 100% functions
- **Test Cases** (8 total):
  - ✓ Should create a boxer account successfully
  - ✓ Should throw error if gym owner does not own the club
  - ✓ Should throw error if club does not exist
  - ✓ Should throw error if email already exists
  - ✓ Should create boxer with minimal data (only required fields)
  - ✓ Should link boxer to club and set gymAffiliation
  - ✓ Should create user with BOXER role
  - ✓ Should set emailVerified to false for gym owner created accounts

### 2. Validator Tests (`backend/tests/utils/gymOwner.validators.test.ts`)
- **Coverage**: 100% statements, 100% branches, 100% functions
- **Test Cases** (36 total):
  - Email validation: format, missing, lowercase conversion, length
  - Password validation: length, complexity requirements
  - Name validation: length, trimming
  - Optional fields: all field validations
  - Edge cases: empty objects, undefined values

## Key Features

### Security
- Password hashing with bcrypt (cost factor 12)
- Email uniqueness validation
- Club ownership verification
- RLS context setting for database operations
- Transaction-based operations for data integrity

### Data Integrity
- Transactional user + boxer creation
- Automatic gymAffiliation sync with club name
- Club linkage (boxer.clubId)
- Email verification set to false (requires verification)

### Error Handling
- Unauthorized access (403)
- Duplicate email (400)
- Club not found (400)
- Validation errors (400)

### Rate Limiting
- `createResourceLimiter` applied to account creation endpoint

### Permissions
- Requires `GYM_OWNER_CREATE_BOXER_ACCOUNT` permission
- Enforced at route level with `requirePermission` middleware

## API Endpoint

```
POST /api/v1/gym-owner/clubs/:clubId/boxers/create-account
```

### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body
```json
{
  "email": "boxer@example.com",
  "password": "SecurePass123",
  "name": "John Boxer",
  "experienceLevel": "BEGINNER",
  "gender": "MALE",
  "weightKg": 75.5,
  "heightCm": 180,
  "city": "New York",
  "country": "USA",
  "dateOfBirth": "1995-01-15T00:00:00.000Z"
}
```

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "boxer@example.com",
      "name": "John Boxer",
      "role": "BOXER",
      "isActive": true,
      "emailVerified": false,
      "createdAt": "2026-02-02T...",
      "updatedAt": "2026-02-02T..."
    },
    "boxer": {
      "id": "uuid",
      "userId": "uuid",
      "name": "John Boxer",
      "experienceLevel": "BEGINNER",
      "gender": "MALE",
      "weightKg": 75.5,
      "heightCm": 180,
      "city": "New York",
      "country": "USA",
      "clubId": "club-uuid",
      "gymAffiliation": "Test Boxing Club",
      "createdAt": "2026-02-02T...",
      "updatedAt": "2026-02-02T..."
    }
  },
  "message": "Boxer account created successfully"
}
```

### Error Responses

**403 Forbidden** - Not authorized to create accounts for this club
```json
{
  "success": false,
  "error": "Not authorized to create accounts for this club"
}
```

**400 Bad Request** - Email already exists
```json
{
  "success": false,
  "error": "User with this email already exists"
}
```

**400 Bad Request** - Validation error
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

## Integration Points

### Database
- Uses Prisma with RLS (Row Level Security)
- Transaction-based operations
- Context setting via `withUserContext`

### Authentication
- JWT-based authentication
- Permission-based authorization
- Role verification (GYM_OWNER)

### Club Service
- Uses `isClubOwner()` to verify ownership
- Fetches club details for gymAffiliation

### Auth Service
- Uses `hashPassword()` for secure password storage

## Next Steps

Phase 2 is now complete. The implementation provides a secure, tested, and well-documented API endpoint for gym owners to create boxer accounts.

**Ready for**:
- Phase 3: Flow A Frontend - Account Creation UI
- Code review
- Integration testing
- Frontend integration

## Test Results

All tests passing:
- Service tests: 8/8 passed (96.42% coverage)
- Validator tests: 36/36 passed (100% coverage)
- Total: 44/44 tests passed

## Notes

- Password requirements follow industry best practices
- Email verification is set to false for gym owner created accounts
- RLS policies ensure data isolation and security
- All operations are transaction-based for data integrity
- Comprehensive error handling for all edge cases
