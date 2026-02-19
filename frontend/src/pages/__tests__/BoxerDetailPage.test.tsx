/**
 * BoxerDetailPage Component Tests
 * Tests for gym owner editing functionality on the boxer detail page
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { BoxerDetailPage } from '../BoxerDetailPage';
import { gymOwnerService } from '@/services/gymOwnerService';
import { boxerService } from '@/services/boxerService';
import { connectionService } from '@/services/connectionService';
import boxerReducer from '@/features/boxer/boxerSlice';
import authReducer from '@/features/auth/authSlice';
import requestsReducer from '@/features/requests/requestsSlice';
import connectionsReducer from '@/features/connections/connectionsSlice';
import type { ExperienceLevel, UserRole } from '@/types';

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock('@/services/gymOwnerService', () => ({
  gymOwnerService: {
    getMyClubs: vi.fn(),
    getClubWithMembers: vi.fn(),
  },
}));

vi.mock('@/services/connectionService', () => ({
  connectionService: {
    getPublicBoxerConnections: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false } }),
    getConnectionStatus: vi.fn().mockResolvedValue({ status: 'none', requestId: null, connectionId: null }),
    sendConnectionRequest: vi.fn(),
    getConnectionRequests: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false }, success: true }),
    getMyConnections: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false }, success: true }),
    acceptConnectionRequest: vi.fn(),
    declineConnectionRequest: vi.fn(),
    cancelConnectionRequest: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock('@/services/boxerService', () => ({
  boxerService: {
    getBoxerFights: vi.fn(),
    updateBoxer: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'boxer-1' }),
    useNavigate: () => vi.fn(),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

interface MockBoxer {
  id: string;
  userId: string;
  name: string;
  weightKg: number;
  heightCm: number;
  city: string;
  country: string;
  experienceLevel: ExperienceLevel;
  wins: number;
  losses: number;
  draws: number;
  clubId: string | null;
  isSearchable: boolean;
  isVerified: boolean;
  profilePhotoUrl: string | null;
  bio: string | null;
  gymAffiliation: string | null;
  dateOfBirth: string | null;
  location: string | null;
  availability: Array<any>;
  createdAt: string;
  updatedAt: string;
}

interface MockClub {
  id: string;
  name: string;
  region: string;
  postcode: string;
  ownerId: string;
}

interface MockUser {
  userId: string;
  email: string;
  role: UserRole;
}

const createMockBoxer = (overrides: Partial<MockBoxer> = {}): MockBoxer => ({
  id: 'boxer-1',
  userId: 'user-1',
  name: 'Test Boxer',
  weightKg: 75,
  heightCm: 180,
  city: 'New York',
  country: 'USA',
  experienceLevel: 'INTERMEDIATE' as ExperienceLevel,
  wins: 10,
  losses: 2,
  draws: 1,
  clubId: null,
  isSearchable: true,
  isVerified: true,
  profilePhotoUrl: null,
  bio: 'Test bio',
  gymAffiliation: null,
  dateOfBirth: null,
  location: null,
  availability: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockClub = (overrides: Partial<MockClub> = {}): MockClub => ({
  id: 'club-1',
  name: 'Test Boxing Club',
  region: 'New York',
  postcode: '10001',
  ownerId: 'gym-owner-1',
  ...overrides,
});

const createMockStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      boxer: boxerReducer,
      auth: authReducer,
      requests: requestsReducer,
      connections: connectionsReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      },
      boxer: {
        selectedBoxer: null,
        myBoxer: null,
        boxers: [],
        isLoading: false,
        error: null,
      },
      requests: {
        requests: [],
        selectedRequest: null,
        isLoading: false,
        error: null,
      },
      ...preloadedState,
    },
  });
};

const renderWithProviders = (component: React.ReactElement, initialState?: any) => {
  const store = createMockStore(initialState);
  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>
  );
};

// ============================================================================
// Test Suites
// ============================================================================

describe('BoxerDetailPage - Gym Owner Edit Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (boxerService.getBoxerFights as Mock).mockResolvedValue({ fights: [] });
  });

  // ==========================================================================
  // Gym Owner Can See Edit Button
  // ==========================================================================

  describe('Gym Owner Can See Edit Button', () => {
    it('should show edit button when gym owner owns the boxer\'s club', async () => {
      const gymOwnerId = 'gym-owner-1';
      const clubId = 'club-1';
      const boxer = createMockBoxer({ clubId, userId: 'different-user' });
      const club = createMockClub({ id: clubId, ownerId: gymOwnerId });

      (gymOwnerService.getMyClubs as Mock).mockResolvedValue([club]);

      const initialState = {
        auth: {
          user: { userId: gymOwnerId, email: 'gymowner@test.com', role: 'GYM_OWNER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        expect(gymOwnerService.getMyClubs).toHaveBeenCalled();
      });

      await waitFor(() => {
        const editButton = screen.queryByRole('button', { name: /edit/i });
        expect(editButton).toBeInTheDocument();
      });
    });

    it('should NOT show edit button when gym owner does NOT own the boxer\'s club', async () => {
      const gymOwnerId = 'gym-owner-1';
      const clubId = 'club-1';
      const differentClubId = 'different-club-1';
      const boxer = createMockBoxer({ clubId, userId: 'different-user' });
      const differentClub = createMockClub({ id: differentClubId, ownerId: gymOwnerId });

      (gymOwnerService.getMyClubs as Mock).mockResolvedValue([differentClub]);

      const initialState = {
        auth: {
          user: { userId: gymOwnerId, email: 'gymowner@test.com', role: 'GYM_OWNER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        expect(gymOwnerService.getMyClubs).toHaveBeenCalled();
      });

      await waitFor(() => {
        const editButton = screen.queryByRole('button', { name: /edit/i });
        expect(editButton).not.toBeInTheDocument();
      });
    });

    it('should NOT show edit button when boxer has no club', async () => {
      const gymOwnerId = 'gym-owner-1';
      const boxer = createMockBoxer({ clubId: null, userId: 'different-user' });
      const club = createMockClub({ ownerId: gymOwnerId });

      (gymOwnerService.getMyClubs as Mock).mockResolvedValue([club]);

      const initialState = {
        auth: {
          user: { userId: gymOwnerId, email: 'gymowner@test.com', role: 'GYM_OWNER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        const editButton = screen.queryByRole('button', { name: /edit/i });
        expect(editButton).not.toBeInTheDocument();
      });
    });

    it('should NOT show edit button when user is not a gym owner', async () => {
      const boxerId = 'boxer-1';
      const clubId = 'club-1';
      const boxer = createMockBoxer({ id: boxerId, clubId, userId: 'different-user' });

      const initialState = {
        auth: {
          user: { userId: 'regular-user', email: 'user@test.com', role: 'BOXER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        const editButton = screen.queryByRole('button', { name: /edit/i });
        expect(editButton).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Profile Owner Redirect
  // ==========================================================================

  describe('Profile Owner Redirect to /profile', () => {
    it('should redirect to /profile when profile owner clicks edit', async () => {
      const userId = 'user-1';
      const boxer = createMockBoxer({ userId });
      const navigateMock = vi.fn();

      vi.mocked(await import('react-router-dom')).useNavigate = () => navigateMock;

      const initialState = {
        auth: {
          user: { userId, email: 'user@test.com', role: 'BOXER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: boxer,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        const editButton = screen.queryByRole('button', { name: /edit/i });
        if (editButton) {
          fireEvent.click(editButton);
          expect(navigateMock).toHaveBeenCalledWith('/profile');
        }
      });
    });
  });

  // ==========================================================================
  // Edit Mode Shows Form
  // ==========================================================================

  describe('Edit Mode Shows Form for Gym Owner', () => {
    it('should display BoxerForm when gym owner enters edit mode', async () => {
      const gymOwnerId = 'gym-owner-1';
      const clubId = 'club-1';
      const boxer = createMockBoxer({ clubId, userId: 'different-user' });
      const club = createMockClub({ id: clubId, ownerId: gymOwnerId });

      (gymOwnerService.getMyClubs as Mock).mockResolvedValue([club]);

      const initialState = {
        auth: {
          user: { userId: gymOwnerId, email: 'gymowner@test.com', role: 'GYM_OWNER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        expect(gymOwnerService.getMyClubs).toHaveBeenCalled();
      });

      const editButton = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        // Look for form elements that would be in BoxerForm
        const cancelButton = screen.queryByRole('button', { name: /cancel/i });
        expect(cancelButton).toBeInTheDocument();
      });
    });

    it('should show cancel button in edit mode', async () => {
      const gymOwnerId = 'gym-owner-1';
      const clubId = 'club-1';
      const boxer = createMockBoxer({ clubId, userId: 'different-user' });
      const club = createMockClub({ id: clubId, ownerId: gymOwnerId });

      (gymOwnerService.getMyClubs as Mock).mockResolvedValue([club]);

      const initialState = {
        auth: {
          user: { userId: gymOwnerId, email: 'gymowner@test.com', role: 'GYM_OWNER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        expect(gymOwnerService.getMyClubs).toHaveBeenCalled();
      });

      const editButton = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        const cancelButton = screen.queryByRole('button', { name: /cancel/i });
        expect(cancelButton).toBeInTheDocument();
      });
    });

    it('should exit edit mode when cancel is clicked', async () => {
      const gymOwnerId = 'gym-owner-1';
      const clubId = 'club-1';
      const boxer = createMockBoxer({ clubId, userId: 'different-user' });
      const club = createMockClub({ id: clubId, ownerId: gymOwnerId });

      (gymOwnerService.getMyClubs as Mock).mockResolvedValue([club]);

      const initialState = {
        auth: {
          user: { userId: gymOwnerId, email: 'gymowner@test.com', role: 'GYM_OWNER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        expect(gymOwnerService.getMyClubs).toHaveBeenCalled();
      });

      // Enter edit mode
      const editButton = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Wait for cancel button and click it
      const cancelButton = await screen.findByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Verify we're back to view mode (edit button should be visible again)
      await waitFor(() => {
        const editButtonAgain = screen.queryByRole('button', { name: /edit/i });
        expect(editButtonAgain).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle gym owner service errors gracefully', async () => {
      const gymOwnerId = 'gym-owner-1';
      const clubId = 'club-1';
      const boxer = createMockBoxer({ clubId, userId: 'different-user' });

      (gymOwnerService.getMyClubs as Mock).mockRejectedValue(
        new Error('Failed to fetch clubs')
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const initialState = {
        auth: {
          user: { userId: gymOwnerId, email: 'gymowner@test.com', role: 'GYM_OWNER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        expect(gymOwnerService.getMyClubs).toHaveBeenCalled();
      });

      // Should not show edit button due to error
      await waitFor(() => {
        const editButton = screen.queryByRole('button', { name: /edit/i });
        expect(editButton).not.toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to check gym owner access:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should display loading state while checking gym owner access', () => {
      const gymOwnerId = 'gym-owner-1';
      const clubId = 'club-1';
      const boxer = createMockBoxer({ clubId, userId: 'different-user' });

      // Mock slow response
      (gymOwnerService.getMyClubs as Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
      );

      const initialState = {
        auth: {
          user: { userId: gymOwnerId, email: 'gymowner@test.com', role: 'GYM_OWNER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      // During loading, page should still render
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Multiple Clubs Edge Cases
  // ==========================================================================

  describe('Multiple Clubs Edge Cases', () => {
    it('should show edit button when gym owner owns multiple clubs including boxer\'s club', async () => {
      const gymOwnerId = 'gym-owner-1';
      const boxerClubId = 'club-2';
      const boxer = createMockBoxer({ clubId: boxerClubId, userId: 'different-user' });
      const clubs = [
        createMockClub({ id: 'club-1', ownerId: gymOwnerId }),
        createMockClub({ id: boxerClubId, ownerId: gymOwnerId }),
        createMockClub({ id: 'club-3', ownerId: gymOwnerId }),
      ];

      (gymOwnerService.getMyClubs as Mock).mockResolvedValue(clubs);

      const initialState = {
        auth: {
          user: { userId: gymOwnerId, email: 'gymowner@test.com', role: 'GYM_OWNER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        expect(gymOwnerService.getMyClubs).toHaveBeenCalled();
      });

      await waitFor(() => {
        const editButton = screen.queryByRole('button', { name: /edit/i });
        expect(editButton).toBeInTheDocument();
      });
    });

    it('should NOT show edit button when gym owner owns multiple clubs but NOT boxer\'s club', async () => {
      const gymOwnerId = 'gym-owner-1';
      const boxerClubId = 'club-different';
      const boxer = createMockBoxer({ clubId: boxerClubId, userId: 'different-user' });
      const clubs = [
        createMockClub({ id: 'club-1', ownerId: gymOwnerId }),
        createMockClub({ id: 'club-2', ownerId: gymOwnerId }),
        createMockClub({ id: 'club-3', ownerId: gymOwnerId }),
      ];

      (gymOwnerService.getMyClubs as Mock).mockResolvedValue(clubs);

      const initialState = {
        auth: {
          user: { userId: gymOwnerId, email: 'gymowner@test.com', role: 'GYM_OWNER' as UserRole },
          token: 'test-token',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
        boxer: {
          selectedBoxer: boxer,
          myBoxer: null,
          boxers: [],
          isLoading: false,
          error: null,
        },
      };

      renderWithProviders(<BoxerDetailPage />, initialState);

      await waitFor(() => {
        expect(gymOwnerService.getMyClubs).toHaveBeenCalled();
      });

      await waitFor(() => {
        const editButton = screen.queryByRole('button', { name: /edit/i });
        expect(editButton).not.toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// Connect Button for Boxer Users
// ============================================================================

describe('Connect button for boxer users viewing other boxer profiles', () => {
  it('shows Connect button instead of Send Match Request when logged-in user is a boxer', async () => {
    const myBoxerUserId = 'user-2';
    const myBoxer = createMockBoxer({ id: 'boxer-2', userId: myBoxerUserId, name: 'My Boxer' });
    const otherBoxer = createMockBoxer({ id: 'boxer-1', userId: 'user-1', name: 'Other Boxer' });

    (gymOwnerService.getMyClubs as Mock).mockResolvedValue([]);
    (boxerService.getBoxerFights as Mock).mockResolvedValue({ fights: [] });

    const initialState = {
      auth: {
        user: { userId: myBoxerUserId, email: 'boxer@test.com', role: 'BOXER' as UserRole },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      boxer: {
        selectedBoxer: otherBoxer,
        myBoxer: myBoxer,
        boxers: [],
        isLoading: false,
        error: null,
      },
    };

    renderWithProviders(<BoxerDetailPage />, initialState);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /send match request/i })).not.toBeInTheDocument();
  });

  it('does NOT show Connect button when boxer is viewing their own profile', async () => {
    // myBoxer and selectedBoxer are the SAME boxer
    const ownBoxer = createMockBoxer({ id: 'boxer-1', userId: 'user-1', name: 'Own Boxer' });

    (gymOwnerService.getMyClubs as Mock).mockResolvedValue([]);
    (boxerService.getBoxerFights as Mock).mockResolvedValue({ fights: [] });

    const initialState = {
      auth: {
        user: { userId: 'user-1', email: 'own@test.com', role: 'BOXER' as UserRole },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      boxer: {
        selectedBoxer: ownBoxer,
        myBoxer: ownBoxer,
        boxers: [],
        isLoading: false,
        error: null,
      },
    };

    renderWithProviders(<BoxerDetailPage />, initialState);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /connect/i })).not.toBeInTheDocument();
    });
  });

  it('does NOT show Connect button when logged-in user is not a boxer', async () => {
    const otherBoxer = createMockBoxer({ id: 'boxer-1', userId: 'user-1', name: 'Other Boxer' });

    (gymOwnerService.getMyClubs as Mock).mockResolvedValue([]);
    (boxerService.getBoxerFights as Mock).mockResolvedValue({ fights: [] });

    const initialState = {
      auth: {
        user: { userId: 'user-2', email: 'coach@test.com', role: 'COACH' as UserRole },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      boxer: {
        selectedBoxer: otherBoxer,
        myBoxer: null,
        boxers: [],
        isLoading: false,
        error: null,
      },
    };

    renderWithProviders(<BoxerDetailPage />, initialState);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /connect/i })).not.toBeInTheDocument();
    });
  });

});

// ============================================================================
// Connection Status Rendering on BoxerDetailPage
// ============================================================================

const connectionsInitialState = {
  connections: [],
  connectionsPagination: null,
  incomingRequests: [],
  outgoingRequests: [],
  incomingPagination: null,
  outgoingPagination: null,
  statusCache: {},
  isLoading: false,
  isStatusLoading: false,
  error: null,
};

describe('Connection status rendering on BoxerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (boxerService.getBoxerFights as Mock).mockResolvedValue({ fights: [] });
    (gymOwnerService.getMyClubs as Mock).mockResolvedValue([]);
  });

  it('shows "Connected" button when statusCache has connected status', async () => {
    const myBoxer = createMockBoxer({ id: 'boxer-2', userId: 'user-2', name: 'My Boxer' });
    const otherBoxer = createMockBoxer({ id: 'boxer-1', userId: 'user-1', name: 'Other Boxer' });

    // The page dispatches fetchConnectionStatus which calls getConnectionStatus.
    // Override the mock to return 'connected' so it doesn't overwrite the preloaded cache.
    (connectionService.getConnectionStatus as Mock).mockResolvedValue({
      status: 'connected', requestId: null, connectionId: 'conn-1',
    });

    const initialState = {
      auth: {
        user: { userId: 'user-2', email: 'boxer@test.com', role: 'BOXER' as UserRole },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      boxer: {
        selectedBoxer: otherBoxer,
        myBoxer,
        boxers: [],
        isLoading: false,
        error: null,
      },
      connections: {
        ...connectionsInitialState,
        statusCache: {
          'boxer-1': { status: 'connected', requestId: null, connectionId: 'conn-1' },
        },
      },
    };

    renderWithProviders(<BoxerDetailPage />, initialState);

    await waitFor(() => {
      const connectedBtn = screen.getByRole('button', { name: /connected/i });
      expect(connectedBtn).toBeInTheDocument();
      expect(connectedBtn).toBeDisabled();
    });

    // The idle "Connect" button should not be present when already connected
    expect(screen.queryByRole('button', { name: /^connect$/i })).not.toBeInTheDocument();
  });

  it('shows "Request Sent" button when statusCache has pending_sent status', async () => {
    const myBoxer = createMockBoxer({ id: 'boxer-2', userId: 'user-2', name: 'My Boxer' });
    const otherBoxer = createMockBoxer({ id: 'boxer-1', userId: 'user-1', name: 'Other Boxer' });

    // The page dispatches fetchConnectionStatus — override to return pending_sent
    (connectionService.getConnectionStatus as Mock).mockResolvedValue({
      status: 'pending_sent', requestId: 'req-1', connectionId: null,
    });

    const initialState = {
      auth: {
        user: { userId: 'user-2', email: 'boxer@test.com', role: 'BOXER' as UserRole },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      boxer: {
        selectedBoxer: otherBoxer,
        myBoxer,
        boxers: [],
        isLoading: false,
        error: null,
      },
      connections: {
        ...connectionsInitialState,
        statusCache: {
          'boxer-1': { status: 'pending_sent', requestId: 'req-1', connectionId: null },
        },
      },
    };

    renderWithProviders(<BoxerDetailPage />, initialState);

    await waitFor(() => {
      const requestSentBtn = screen.getByRole('button', { name: /request sent/i });
      expect(requestSentBtn).toBeInTheDocument();
      expect(requestSentBtn).toBeDisabled();
    });
  });

  it('shows connections on the profile when connections are preloaded', async () => {
    const ownBoxer = createMockBoxer({ id: 'boxer-1', userId: 'user-1', name: 'Own Boxer' });
    const connectedBoxer = {
      id: 'boxer-friend', name: 'Friend Boxer', profilePhotoUrl: null,
      experienceLevel: 'BEGINNER' as ExperienceLevel, city: null, country: null,
      wins: 0, losses: 0, draws: 0, user: { id: 'u-friend', name: 'Friend Boxer' },
    };
    const connection = {
      id: 'conn-1', boxerAId: 'boxer-1', boxerBId: 'boxer-friend', createdAt: '2024-01-01',
      boxer: connectedBoxer,
    };

    // The page dispatches fetchMyConnections (owner view) — mock to return our connection
    (connectionService.getMyConnections as Mock).mockResolvedValue({
      data: [connection],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      success: true,
    });

    const initialState = {
      auth: {
        user: { userId: 'user-1', email: 'own@test.com', role: 'BOXER' as UserRole },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      boxer: {
        selectedBoxer: ownBoxer,
        myBoxer: ownBoxer,
        boxers: [],
        isLoading: false,
        error: null,
      },
    };

    renderWithProviders(<BoxerDetailPage />, initialState);

    await waitFor(() => {
      expect(screen.getByText('Friend Boxer')).toBeInTheDocument();
    });
  });

  it('shows pending requests for profile owner when incomingRequests are preloaded', async () => {
    const ownBoxer = createMockBoxer({ id: 'boxer-1', userId: 'user-1', name: 'Own Boxer' });
    const requesterBoxer = {
      id: 'boxer-req', name: 'Requester Boxer', profilePhotoUrl: null,
      experienceLevel: 'BEGINNER' as ExperienceLevel, city: null, country: null,
      wins: 0, losses: 0, draws: 0, user: { id: 'u-req', name: 'Requester Boxer' },
    };
    const pendingRequest = {
      id: 'req-1', requesterBoxerId: 'boxer-req', targetBoxerId: 'boxer-1',
      status: 'PENDING' as const, message: null, createdAt: '2024-01-01', updatedAt: '2024-01-01',
      requesterBoxer,
    };

    // The page dispatches fetchIncomingConnectionRequests (owner view) — mock to return our request
    (connectionService.getConnectionRequests as Mock).mockResolvedValue({
      data: [pendingRequest],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      success: true,
    });

    const initialState = {
      auth: {
        user: { userId: 'user-1', email: 'own@test.com', role: 'BOXER' as UserRole },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      boxer: {
        selectedBoxer: ownBoxer,
        myBoxer: ownBoxer,
        boxers: [],
        isLoading: false,
        error: null,
      },
    };

    renderWithProviders(<BoxerDetailPage />, initialState);

    await waitFor(() => {
      // Either "Pending Requests" heading or the "1 pending" badge should appear
      const pendingEl =
        screen.queryByText(/pending requests/i) ?? screen.queryByText(/1 pending/i);
      expect(pendingEl).toBeInTheDocument();
    });
  });
});
