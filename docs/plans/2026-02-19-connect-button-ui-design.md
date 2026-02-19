# Connect Button UI Design

**Date**: 2026-02-19
**Status**: Approved
**Scope**: UI only — no backend implementation

---

## Problem

When a logged-in boxer views another boxer's profile, the current UI shows a **"Send Match Request"** button. Boxers should not be able to request fights directly — instead they should be able to request a connection (become friends/sparring partners). Fight request access remains available for other roles in future.

---

## Solution

Replace the "Send Match Request" button with a **`ConnectButton`** component when the logged-in user is a boxer viewing another boxer's profile.

---

## Component: `ConnectButton`

**File**: `frontend/src/components/boxer/ConnectButton.tsx`

### States

| State | Label | Style | Behaviour |
|-------|-------|-------|-----------|
| `idle` | "Connect" | Primary (blue), enabled | Calls `onConnect()`, transitions to `pending` |
| `pending` | "Request Sent" | Muted/secondary, disabled | No action |
| `connected` | "Connected" | Green/success, disabled | No action |

### Props

```typescript
interface ConnectButtonProps {
  onConnect: () => void;
  initialState?: 'idle' | 'pending' | 'connected'; // defaults to 'idle'
}
```

State is managed locally via `useState`. When the backend is wired up, `initialState` will be derived from the connection status API response.

---

## Changes to Existing Files

### `BoxerProfile.tsx`

- Add `onConnect?: () => void` prop
- Render `<ConnectButton onConnect={onConnect} />` when `!isOwner && onConnect`
- Keep `onSendRequest` prop intact (other roles may use it later)
- The two buttons are mutually exclusive — only one is passed at a time

### `BoxerDetailPage.tsx`

- When `myBoxer` is truthy (logged-in user is a boxer) and not the owner:
  - Pass `onConnect={handleConnect}` to `BoxerProfile`
  - Do NOT pass `onSendRequest`
- `handleConnect` is a no-op for now (state lives inside `ConnectButton`)

---

## What is NOT in scope

- Backend API for connections
- Persisting connection state across page reloads
- Notifications or connection request inbox
- The `BoxersPage` card view (search listing) — connect button stays on the detail page only for now
