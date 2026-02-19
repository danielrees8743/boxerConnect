# Connect Button UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "Send Match Request" button with a three-state "Connect" button when a logged-in boxer views another boxer's profile.

**Architecture:** Create a new `ConnectButton` component that manages its own local state (`idle → pending → connected`). Update `BoxerProfile` to accept an `onConnect` prop (mutually exclusive with `onSendRequest`). Update `BoxerDetailPage` to pass `onConnect` when the logged-in user is a boxer viewing another boxer's profile.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide icons, `@/components/ui` (Button, Badge), Vitest + React Testing Library

---

### Task 1: Create `ConnectButton` component (TDD)

**Files:**
- Create: `frontend/src/components/boxer/ConnectButton.tsx`
- Create: `frontend/src/components/boxer/__tests__/ConnectButton.test.tsx`
- Modify: `frontend/src/components/boxer/index.ts`

---

**Step 1: Create the test file**

Create `frontend/src/components/boxer/__tests__/ConnectButton.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectButton } from '../ConnectButton';

describe('ConnectButton', () => {
  it('renders "Connect" button in idle state by default', () => {
    render(<ConnectButton onConnect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('renders "Connect" button in idle state when initialState is idle', () => {
    render(<ConnectButton onConnect={vi.fn()} initialState="idle" />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('calls onConnect and transitions to pending when clicked from idle', () => {
    const onConnect = vi.fn();
    render(<ConnectButton onConnect={onConnect} />);
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /request sent/i })).toBeInTheDocument();
  });

  it('renders "Request Sent" and is disabled when initialState is pending', () => {
    render(<ConnectButton onConnect={vi.fn()} initialState="pending" />);
    const btn = screen.getByRole('button', { name: /request sent/i });
    expect(btn).toBeDisabled();
  });

  it('renders "Connected" and is disabled when initialState is connected', () => {
    render(<ConnectButton onConnect={vi.fn()} initialState="connected" />);
    const btn = screen.getByRole('button', { name: /connected/i });
    expect(btn).toBeDisabled();
  });

  it('does not call onConnect when already in pending state', () => {
    const onConnect = vi.fn();
    render(<ConnectButton onConnect={onConnect} initialState="pending" />);
    // button is disabled, click should not fire
    fireEvent.click(screen.getByRole('button', { name: /request sent/i }));
    expect(onConnect).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/frontend
npx vitest run src/components/boxer/__tests__/ConnectButton.test.tsx
```

Expected: All tests FAIL with "Cannot find module '../ConnectButton'"

---

**Step 3: Implement `ConnectButton`**

Create `frontend/src/components/boxer/ConnectButton.tsx`:

```typescript
import React, { useState } from 'react';
import { UserPlus, Clock, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui';

type ConnectState = 'idle' | 'pending' | 'connected';

interface ConnectButtonProps {
  onConnect: () => void;
  initialState?: ConnectState;
}

export const ConnectButton: React.FC<ConnectButtonProps> = ({
  onConnect,
  initialState = 'idle',
}) => {
  const [state, setState] = useState<ConnectState>(initialState);

  const handleClick = () => {
    onConnect();
    setState('pending');
  };

  if (state === 'connected') {
    return (
      <Button variant="outline" disabled className="text-green-600 border-green-600">
        <UserCheck className="h-4 w-4 mr-2" />
        Connected
      </Button>
    );
  }

  if (state === 'pending') {
    return (
      <Button variant="secondary" disabled>
        <Clock className="h-4 w-4 mr-2" />
        Request Sent
      </Button>
    );
  }

  return (
    <Button onClick={handleClick}>
      <UserPlus className="h-4 w-4 mr-2" />
      Connect
    </Button>
  );
};
```

**Step 4: Run tests to verify they pass**

```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/frontend
npx vitest run src/components/boxer/__tests__/ConnectButton.test.tsx
```

Expected: All 6 tests PASS

---

**Step 5: Export from barrel**

Add to `frontend/src/components/boxer/index.ts` after the last export line:

```typescript
export { ConnectButton } from './ConnectButton';
```

**Step 6: Commit**

```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/frontend
git add src/components/boxer/ConnectButton.tsx src/components/boxer/__tests__/ConnectButton.test.tsx src/components/boxer/index.ts
git commit -m "feat(connect): add ConnectButton component with three-state UI

Idle → pending → connected transitions managed via local state.
initialState prop allows future backend hydration.

Co-authored-by: Claude <claude@anthropic.com>"
```

---

### Task 2: Update `BoxerProfile` to accept and render `ConnectButton`

**Files:**
- Modify: `frontend/src/components/boxer/BoxerProfile.tsx:31-41` (props interface)
- Modify: `frontend/src/components/boxer/BoxerProfile.tsx:99-109` (destructuring)
- Modify: `frontend/src/components/boxer/BoxerProfile.tsx:160-170` (button render)

---

**Step 1: Write the failing test**

Add a new test file `frontend/src/components/boxer/__tests__/BoxerProfile.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoxerProfile } from '../BoxerProfile';
import type { BoxerProfile as BoxerProfileType } from '@/types';

const mockBoxer: BoxerProfileType = {
  id: 'boxer-1',
  userId: 'user-1',
  name: 'Test Boxer',
  weightKg: 70,
  heightCm: 175,
  dateOfBirth: '1995-01-01',
  location: null,
  city: 'London',
  country: 'UK',
  gender: 'MALE',
  experienceLevel: 'INTERMEDIATE',
  wins: 5,
  losses: 2,
  draws: 1,
  gymAffiliation: null,
  bio: null,
  profilePhotoUrl: null,
  isVerified: false,
  isSearchable: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('BoxerProfile - action buttons', () => {
  it('renders Connect button when onConnect is provided and not owner', () => {
    render(
      <BoxerProfile boxer={mockBoxer} isOwner={false} onConnect={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('does not render Connect button when isOwner is true', () => {
    render(
      <BoxerProfile boxer={mockBoxer} isOwner={true} onConnect={vi.fn()} />
    );
    expect(screen.queryByRole('button', { name: /connect/i })).not.toBeInTheDocument();
  });

  it('does not render Send Match Request when onConnect is provided', () => {
    render(
      <BoxerProfile boxer={mockBoxer} isOwner={false} onConnect={vi.fn()} />
    );
    expect(screen.queryByText(/send match request/i)).not.toBeInTheDocument();
  });

  it('still renders Send Match Request when onSendRequest is provided (backward compat)', () => {
    render(
      <BoxerProfile boxer={mockBoxer} isOwner={false} onSendRequest={vi.fn()} />
    );
    expect(screen.getByText(/send match request/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/frontend
npx vitest run src/components/boxer/__tests__/BoxerProfile.test.tsx
```

Expected: FAIL — "onConnect" prop not recognised, Connect button not found

---

**Step 3: Update `BoxerProfile.tsx`**

In `frontend/src/components/boxer/BoxerProfile.tsx`:

**3a. Update imports** — add `ConnectButton` import after the `Button` import block (line 27):

```typescript
import { ConnectButton } from './ConnectButton';
```

**3b. Update the props interface** (lines 31-41) — add `onConnect`:

```typescript
interface BoxerProfileProps {
  boxer: BoxerProfileType | null;
  fightHistory?: FightHistory[];
  availability?: Availability[];
  videos?: BoxerVideo[];
  isOwner?: boolean;
  isLoading?: boolean;
  onEdit?: () => void;
  onSendRequest?: () => void;
  onConnect?: () => void;
  className?: string;
}
```

**3c. Update destructuring** (lines 99-109) — add `onConnect`:

```typescript
export const BoxerProfile: React.FC<BoxerProfileProps> = ({
  boxer,
  fightHistory = [],
  availability = [],
  videos = [],
  isOwner = false,
  isLoading = false,
  onEdit,
  onSendRequest,
  onConnect,
  className,
}) => {
```

**3d. Update the button render block** (lines 160-170) — replace the single `onSendRequest` button with conditional logic:

```typescript
<div className="flex gap-2">
  {onEdit && (
    <Button variant="outline" onClick={onEdit}>
      <Edit2 className="h-4 w-4 mr-2" />
      Edit Profile
    </Button>
  )}
  {!isOwner && onConnect && (
    <ConnectButton onConnect={onConnect} />
  )}
  {!isOwner && onSendRequest && (
    <Button onClick={onSendRequest}>Send Match Request</Button>
  )}
</div>
```

**Step 4: Run tests to verify they pass**

```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/frontend
npx vitest run src/components/boxer/__tests__/BoxerProfile.test.tsx
```

Expected: All 4 tests PASS

**Step 5: Commit**

```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/frontend
git add src/components/boxer/BoxerProfile.tsx src/components/boxer/__tests__/BoxerProfile.test.tsx
git commit -m "feat(connect): add onConnect prop to BoxerProfile component

Renders ConnectButton when onConnect is provided. onSendRequest
remains for backward compatibility with non-boxer roles.

Co-authored-by: Claude <claude@anthropic.com>"
```

---

### Task 3: Update `BoxerDetailPage` to pass `onConnect` for boxer users

**Files:**
- Modify: `frontend/src/pages/BoxerDetailPage.tsx:145-154` (add `handleConnect`)
- Modify: `frontend/src/pages/BoxerDetailPage.tsx:216-224` (update `BoxerProfile` usage)
- Modify: `frontend/src/pages/__tests__/BoxerDetailPage.test.tsx` (add connect button tests)

---

**Step 1: Write the failing test**

Open `frontend/src/pages/__tests__/BoxerDetailPage.test.tsx` and add a new `describe` block at the end of the existing file:

```typescript
describe('BoxerDetailPage - connect button for boxer users', () => {
  it('shows Connect button (not Send Match Request) when logged-in user is a boxer viewing another boxer', async () => {
    const store = createMockStore({
      auth: { user: mockBoxerUser, token: 'token', isAuthenticated: true, isLoading: false, error: null },
      boxer: {
        selectedBoxer: mockOtherBoxer,  // a different boxer
        myBoxer: mockMyBoxer,           // current user's boxer profile
        boxers: [],
        isLoading: false,
        error: null,
      },
      requests: { requests: [], isLoading: false, error: null, stats: null },
    });

    (gymOwnerService.getMyClubs as Mock).mockResolvedValue([]);
    (boxerService.getBoxerFights as Mock).mockResolvedValue({ fights: [] });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <BoxerDetailPage />
        </BrowserRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/send match request/i)).not.toBeInTheDocument();
  });
});
```

> **Note:** `mockOtherBoxer`, `mockMyBoxer`, and `mockBoxerUser` should already exist in the test file helpers, or add them following the same pattern as existing mocks in the file. `createMockStore` should also follow the existing helper pattern.

**Step 2: Run test to verify it fails**

```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/frontend
npx vitest run src/pages/__tests__/BoxerDetailPage.test.tsx
```

Expected: FAIL — Connect button not found

---

**Step 3: Update `BoxerDetailPage.tsx`**

**3a. Add `handleConnect` handler** after `handleSendRequest` (after line 147):

```typescript
const handleConnect = () => {
  // State is managed locally in ConnectButton for now.
  // Wire up to backend connection API when ready.
};
```

**3b. Update the `BoxerProfile` JSX** (lines 216-224) — replace `onSendRequest` with `onConnect` when the logged-in user is a boxer:

```typescript
<BoxerProfile
  boxer={selectedBoxer}
  fightHistory={fights}
  availability={selectedBoxer?.availability || []}
  isOwner={isOwner}
  isLoading={isLoading}
  onEdit={canEdit ? handleEditProfile : undefined}
  onConnect={!isOwner && myBoxer ? handleConnect : undefined}
/>
```

> `myBoxer` being truthy means the logged-in user has a boxer profile (i.e. they are a boxer). `onSendRequest` is removed from here — the `SendRequestDialog` is no longer triggered from this flow.

**Step 4: Run tests to verify they pass**

```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/frontend
npx vitest run src/pages/__tests__/BoxerDetailPage.test.tsx
```

Expected: All tests PASS (existing + new)

**Step 5: Run full test suite**

```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/frontend
npx vitest run
```

Expected: All tests PASS

**Step 6: Commit**

```bash
cd /Users/dan/Desktop/Projects/BoxerConnect/frontend
git add src/pages/BoxerDetailPage.tsx src/pages/__tests__/BoxerDetailPage.test.tsx
git commit -m "feat(connect): wire Connect button into BoxerDetailPage

Boxer users now see Connect instead of Send Match Request when
viewing other boxer profiles. handleConnect is a no-op stub
until the backend connection API is implemented.

Co-authored-by: Claude <claude@anthropic.com>"
```

---

## Manual Verification Checklist

After all tasks are done, verify in the browser:

1. Log in as a boxer user
2. Navigate to `/boxers` and click on a different boxer's profile
3. Confirm you see **"Connect"** button (not "Send Match Request")
4. Click Connect — button should change to **"Request Sent"** (disabled)
5. Refresh the page — button returns to "Connect" (expected — state is local only)
6. View your own profile at `/profile` — no Connect button should appear
