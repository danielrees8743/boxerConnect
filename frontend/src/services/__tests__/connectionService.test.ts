// Connection Service Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connectionService } from '../connectionService';
import { apiClient } from '../apiClient';

vi.mock('../apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('connectionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sendConnectionRequest posts to /connections and returns connectionRequest', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: { connectionRequest: { id: 'req-1', status: 'PENDING' } } },
    });
    const result = await connectionService.sendConnectionRequest({ targetBoxerId: 'boxer-b' });
    expect(result.id).toBe('req-1');
    expect(apiClient.post).toHaveBeenCalledWith('/connections', { targetBoxerId: 'boxer-b' });
  });

  it('getConnectionStatus gets from /connections/status/:boxerId', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: { status: 'none', requestId: null, connectionId: null } },
    });
    const result = await connectionService.getConnectionStatus('boxer-b');
    expect(result.status).toBe('none');
    expect(apiClient.get).toHaveBeenCalledWith('/connections/status/boxer-b');
  });

  it('acceptConnectionRequest puts to /connections/requests/:id/accept', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        data: {
          connectionRequest: { id: 'req-1', status: 'ACCEPTED' },
          connection: { id: 'conn-1' },
        },
      },
    });
    const result = await connectionService.acceptConnectionRequest('req-1');
    expect(result.connectionRequest.status).toBe('ACCEPTED');
  });

  it('declineConnectionRequest puts to /connections/requests/:id/decline', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: { connectionRequest: { id: 'req-1', status: 'DECLINED' } } },
    });
    const result = await connectionService.declineConnectionRequest('req-1');
    expect(result.connectionRequest.status).toBe('DECLINED');
  });

  it('cancelConnectionRequest deletes /connections/requests/:id', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    await connectionService.cancelConnectionRequest('req-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/connections/requests/req-1');
  });

  it('disconnect deletes /connections/:connectionId', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    await connectionService.disconnect('conn-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/connections/conn-1');
  });

  it('getConnectionRequests gets from /connections/requests', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: [], pagination: { total: 0, page: 1, limit: 20 } },
    });
    await connectionService.getConnectionRequests();
    expect(apiClient.get).toHaveBeenCalledWith('/connections/requests', { params: undefined });
  });

  it('getMyConnections gets from /connections', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: [], pagination: { total: 0, page: 1, limit: 20 } },
    });
    await connectionService.getMyConnections();
    expect(apiClient.get).toHaveBeenCalledWith('/connections', { params: undefined });
  });

  it('getPublicBoxerConnections gets from /boxers/:boxerId/connections', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: [], pagination: { total: 0, page: 1, limit: 20 } },
    });
    const result = await connectionService.getPublicBoxerConnections('boxer-1');
    expect(apiClient.get).toHaveBeenCalledWith('/boxers/boxer-1/connections', { params: undefined });
    expect(result).toBeDefined();
  });
});
