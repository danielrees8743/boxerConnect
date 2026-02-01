# Profile Photo API

API endpoints for managing boxer profile photos.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
  - [Upload Profile Photo](#upload-profile-photo)
  - [Delete Profile Photo](#delete-profile-photo)
- [Image Processing](#image-processing)
- [Error Responses](#error-responses)

---

## Overview

The Profile Photo API allows authenticated boxers to upload and manage their profile photos. All uploaded images are automatically processed for consistency and security:

- **Format**: Converted to WebP for optimal file size
- **Dimensions**: Resized to fit within 400x400 pixels (aspect ratio preserved)
- **Metadata**: EXIF and other metadata stripped for privacy and security
- **Quality**: Compressed at 80% quality for balance between size and clarity

---

## Endpoints

### Upload Profile Photo

Upload a new profile photo for the authenticated boxer. If a photo already exists, it will be replaced.

**Endpoint:** `POST /api/v1/boxers/me/photo`

**Authentication:** Required (Bearer token)

**Authorization:** BOXER role required

**Rate Limit:** Create Resource (30 requests per hour)

**Content-Type:** `multipart/form-data`

#### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| photo | file | Yes | Image file to upload |

**File Constraints:**

| Constraint | Value |
|------------|-------|
| Maximum size | 5 MB |
| Allowed formats | JPEG, PNG, WebP, GIF |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |

#### Example Request

Using curl:

```bash
curl -X POST http://localhost:3001/api/v1/boxers/me/photo \
  -H "Authorization: Bearer <access_token>" \
  -F "photo=@/path/to/photo.jpg"
```

Using JavaScript (fetch):

```javascript
const formData = new FormData();
formData.append('photo', fileInput.files[0]);

const response = await fetch('/api/v1/boxers/me/photo', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  body: formData,
});
```

#### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "profilePhotoUrl": "/uploads/profile-photos/550e8400-e29b-41d4-a716-446655440000.webp",
    "size": 12345,
    "mimeType": "image/webp"
  },
  "message": "Profile photo uploaded successfully"
}
```

| Field | Type | Description |
|-------|------|-------------|
| profilePhotoUrl | string | URL path to access the uploaded photo |
| size | number | Size of the processed image in bytes |
| mimeType | string | MIME type of the stored image (always `image/webp`) |

---

### Delete Profile Photo

Remove the profile photo for the authenticated boxer.

**Endpoint:** `DELETE /api/v1/boxers/me/photo`

**Authentication:** Required (Bearer token)

**Authorization:** BOXER role required

**Rate Limit:** Standard (100 requests per 15 minutes)

#### Example Request

Using curl:

```bash
curl -X DELETE http://localhost:3001/api/v1/boxers/me/photo \
  -H "Authorization: Bearer <access_token>"
```

Using JavaScript (fetch):

```javascript
const response = await fetch('/api/v1/boxers/me/photo', {
  method: 'DELETE',
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
  "data": null,
  "message": "Profile photo removed successfully"
}
```

**Note:** If no photo exists, the request still succeeds (idempotent behavior).

---

## Image Processing

All uploaded images undergo automatic processing using the [sharp](https://sharp.pixelplumbing.com/) library:

### Processing Pipeline

1. **Orientation Correction**: Auto-rotate based on EXIF orientation data
2. **Resize**: Scale to fit within 400x400 pixels
   - Aspect ratio is preserved
   - Images smaller than 400x400 are not enlarged
3. **Format Conversion**: Convert to WebP format
4. **Compression**: Apply 80% quality compression
5. **Metadata Stripping**: Remove all EXIF, IPTC, and XMP metadata

### Security Measures

- **UUID Filenames**: Original filenames are discarded; files are stored with UUID names to prevent filename-based attacks
- **EXIF Removal**: Location data and other sensitive metadata are stripped
- **Path Traversal Prevention**: File keys are validated to prevent directory traversal attacks

---

## Error Responses

### 400 Bad Request

**No file uploaded:**

```json
{
  "success": false,
  "error": "No file uploaded. Please provide a photo."
}
```

**Invalid file type:**

```json
{
  "success": false,
  "error": "Invalid file type. Allowed types: image/jpeg, image/png, image/webp, image/gif"
}
```

**Wrong field name:**

```json
{
  "success": false,
  "error": "Unexpected field name. Use \"photo\" as the field name."
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

```json
{
  "success": false,
  "error": "Access denied. BOXER role required."
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Boxer profile not found"
}
```

This occurs when the authenticated user does not have a boxer profile.

### 413 Payload Too Large

```json
{
  "success": false,
  "error": "File too large. Maximum size is 5MB"
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

## Related Documentation

- [Boxer Endpoints](../API.md#boxer-endpoints) - Main boxer profile API documentation
- [Storage Architecture](../architecture/storage.md) - Storage system internals
- [Authentication](../API.md#authentication) - Authentication and authorization
