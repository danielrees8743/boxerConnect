// Connections Redux Slice Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import connectionsReducer, {
  sendConnectionRequest,
  fetchConnectionStatus,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
  fetchIncomingConnectionRequests,
  fetchOutgoingConnectionRequests,
  fetchMyConnections,
  disconnect,
} from '../connectionsSlice';
import { connectionService } from '@/services/connectionService';

vi.mock('@/services/connectionService', () => ({
  connectionService: {
    sendConnectionRequest: vi.fn(),
    getConnectionStatus: vi.fn(),
    acceptConnectionRequest: vi.fn(),
    declineConnectionRequest: vi.fn(),
    cancelConnectionRequest: vi.fn(),
    getConnectionRequests: vi.fn(),
    getMyConnections: vi.fn(),
    disconnect: vi.fn(),
  },
}));

const makeStore = () => configureStore({ reducer: { connections: connectionsReducer } });

// ============================================================================
// Tests
// ============================================================================

describe('connectionsSlice', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('sendConnectionRequest.fulfilled', () => {
    it('adds to outgoingRequests and updates statusCache', async () => {
      const req = {
        id: 'req-1', requesterBoxerId: 'me', targetBoxerId: 'boxer-b',
        status: 'PENDING' as const, message: null, createdAt: 'now', updatedAt: 'now',
      };
      vi.mocked(connectionService.sendConnectionRequest).mockResolvedValue(req as any);

      const store = makeStore();
      await store.dispatch(sendConnectionRequest({ targetBoxerId: 'boxer-b' }));

      const state = store.getState().connections;
      expect(state.outgoingRequests).toHaveLength(1);
      expect(state.statusCache['boxer-b']?.status).toBe('pending_sent');
    });
  });

  describe('fetchConnectionStatus.fulfilled', () => {
    it('updates statusCache for the given boxer', async () => {
      vi.mocked(connectionService.getConnectionStatus).mockResolvedValue({
        status: 'connected', requestId: null, connectionId: 'conn-1',
      });

      const store = makeStore();
      await store.dispatch(fetchConnectionStatus('boxer-b'));

      expect(store.getState().connections.statusCache['boxer-b']?.status).toBe('connected');
    });
  });

  describe('acceptConnectionRequest.fulfilled', () => {
    it('adds connection and clears from incomingRequests, updates statusCache', async () => {
      vi.mocked(connectionService.acceptConnectionRequest).mockResolvedValue({
        connectionRequest: {
          id: 'req-1', requesterBoxerId: 'boxer-a', targetBoxerId: 'me',
          status: 'ACCEPTED' as const, message: null, createdAt: 'now', updatedAt: 'now',
        } as any,
        connection: {
          id: 'conn-1', boxerAId: 'boxer-a', boxerBId: 'me', createdAt: 'now',
          boxer: { id: 'boxer-a', name: 'Boxer A', profilePhotoUrl: null, experienceLevel: 'BEGINNER' as const, city: null, country: null, wins: 0, losses: 0, draws: 0, user: { id: 'u', name: 'Boxer A' } },
        } as any,
      });

      const store = makeStore();
      await store.dispatch(acceptConnectionRequest('req-1'));

      const state = store.getState().connections;
      expect(state.connections).toHaveLength(1);
      expect(state.statusCache['boxer-a']?.status).toBe('connected');
    });
  });

  describe('cancelConnectionRequest.fulfilled', () => {
    it('removes from outgoingRequests and sets statusCache to none', async () => {
      vi.mocked(connectionService.sendConnectionRequest).mockResolvedValue({
        id: 'req-1', requesterBoxerId: 'me', targetBoxerId: 'boxer-b',
        status: 'PENDING' as const, message: null, createdAt: 'now', updatedAt: 'now',
      } as any);
      vi.mocked(connectionService.cancelConnectionRequest).mockResolvedValue(undefined);

      const store = makeStore();
      // First send a request
      await store.dispatch(sendConnectionRequest({ targetBoxerId: 'boxer-b' }));
      expect(store.getState().connections.outgoingRequests).toHaveLength(1);

      // Then cancel it
      await store.dispatch(cancelConnectionRequest('req-1'));

      const state = store.getState().connections;
      expect(state.outgoingRequests).toHaveLength(0);
      expect(state.statusCache['boxer-b']?.status).toBe('none');
    });
  });

  describe('fetchIncomingConnectionRequests.fulfilled', () => {
    it('populates incomingRequests', async () => {
      const req = {
        id: 'req-1', requesterBoxerId: 'boxer-a', targetBoxerId: 'me',
        status: 'PENDING' as const, message: null, createdAt: 'now', updatedAt: 'now',
      };
      vi.mocked(connectionService.getConnectionRequests).mockResolvedValue({
        data: [req] as any,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        success: true,
      });

      const store = makeStore();
      await store.dispatch(fetchIncomingConnectionRequests());

      expect(store.getState().connections.incomingRequests).toHaveLength(1);
    });
  });

  describe('fetchMyConnections.fulfilled', () => {
    it('populates connections array', async () => {
      const conn = {
        id: 'conn-1', boxerAId: 'a', boxerBId: 'b', createdAt: 'now',
        boxer: { id: 'a', name: 'Alice', profilePhotoUrl: null, experienceLevel: 'BEGINNER' as const, city: null, country: null, wins: 0, losses: 0, draws: 0, user: { id: 'u', name: 'Alice' } },
      };
      vi.mocked(connectionService.getMyConnections).mockResolvedValue({
        data: [conn] as any,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        success: true,
      });

      const store = makeStore();
      await store.dispatch(fetchMyConnections());

      expect(store.getState().connections.connections).toHaveLength(1);
    });
  });

  describe('declineConnectionRequest.fulfilled', () => {
    it('removes from incomingRequests and resets statusCache to none', async () => {
      const pendingReq = {
        id: 'req-1', requesterBoxerId: 'boxer-a', targetBoxerId: 'me',
        status: 'PENDING' as const, message: null, createdAt: 'now', updatedAt: 'now',
      };
      // Pre-load incomingRequests by dispatching fetchIncomingConnectionRequests
      vi.mocked(connectionService.getConnectionRequests).mockResolvedValue({
        data: [pendingReq] as any,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        success: true,
      });

      const store = makeStore();
      await store.dispatch(fetchIncomingConnectionRequests());
      expect(store.getState().connections.incomingRequests).toHaveLength(1);

      // Now decline the request
      vi.mocked(connectionService.declineConnectionRequest).mockResolvedValue({
        connectionRequest: {
          id: 'req-1', requesterBoxerId: 'boxer-a', targetBoxerId: 'me',
          status: 'DECLINED' as const, message: null, createdAt: 'now', updatedAt: 'now',
        } as any,
      } as any);

      await store.dispatch(declineConnectionRequest('req-1'));

      const state = store.getState().connections;
      expect(state.incomingRequests).toHaveLength(0);
      expect(state.statusCache['boxer-a']?.status).toBe('none');
    });
  });

  describe('disconnect.fulfilled', () => {
    it('removes from connections and resets statusCache to none', async () => {
      const conn = {
        id: 'conn-1', boxerAId: 'me', boxerBId: 'boxer-x', createdAt: 'now',
        boxer: { id: 'boxer-x', name: 'Boxer X', profilePhotoUrl: null, experienceLevel: 'BEGINNER' as const, city: null, country: null, wins: 0, losses: 0, draws: 0, user: { id: 'u', name: 'Boxer X' } },
      };

      // Pre-load connections via fetchMyConnections
      vi.mocked(connectionService.getMyConnections).mockResolvedValue({
        data: [conn] as any,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        success: true,
      });

      const store = makeStore();
      await store.dispatch(fetchMyConnections());
      expect(store.getState().connections.connections).toHaveLength(1);

      // Now disconnect
      vi.mocked(connectionService.disconnect).mockResolvedValue(undefined);
      await store.dispatch(disconnect('conn-1'));

      const state = store.getState().connections;
      expect(state.connections).toHaveLength(0);
      expect(state.statusCache['boxer-x']?.status).toBe('none');
    });
  });

  describe('acceptConnectionRequest.fulfilled — boxer backfill', () => {
    it('backfills boxer from requesterBoxer when connection has no boxer field', async () => {
      const requesterBoxer = {
        id: 'boxer-z', name: 'Boxer Z', profilePhotoUrl: null,
        experienceLevel: 'INTERMEDIATE' as const, city: 'Dublin', country: 'IE',
        wins: 3, losses: 1, draws: 0, user: { id: 'u-z', name: 'Boxer Z' },
      };

      vi.mocked(connectionService.acceptConnectionRequest).mockResolvedValue({
        connectionRequest: {
          id: 'req-2', requesterBoxerId: 'boxer-z', targetBoxerId: 'me',
          status: 'ACCEPTED' as const, message: null, createdAt: 'now', updatedAt: 'now',
          requesterBoxer,
        } as any,
        // connection has no boxer field
        connection: {
          id: 'conn-2', boxerAId: 'boxer-z', boxerBId: 'me', createdAt: 'now',
        } as any,
      });

      const store = makeStore();
      await store.dispatch(acceptConnectionRequest('req-2'));

      const state = store.getState().connections;
      expect(state.connections).toHaveLength(1);
      expect(state.connections[0].boxer).toBeDefined();
      expect(state.connections[0].boxer.id).toBe('boxer-z');
      expect(state.connections[0].boxer.name).toBe('Boxer Z');
    });
  });
});
