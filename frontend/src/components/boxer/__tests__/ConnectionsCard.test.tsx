// ConnectionsCard Tests

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConnectionsCard } from '../ConnectionsCard';
import type { Connection, ConnectionRequest } from '@/types';

const mkConn = (id: string, name: string): Connection => ({
  id,
  boxerAId: 'a',
  boxerBId: id,
  createdAt: '2024-01-01',
  boxer: {
    id,
    name,
    profilePhotoUrl: null,
    experienceLevel: 'BEGINNER',
    city: 'London',
    country: 'UK',
    wins: 0,
    losses: 0,
    draws: 0,
    user: { id: `u-${id}`, name },
  },
});

const wrap = (ui: React.ReactElement) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('ConnectionsCard', () => {
  it('renders "No connections yet" when empty', () => {
    wrap(<ConnectionsCard connections={[]} />);
    expect(screen.getByText(/no connections yet/i)).toBeInTheDocument();
  });

  it('renders connection names as links to their profiles', () => {
    wrap(<ConnectionsCard connections={[mkConn('boxer-1', 'Riley Martinez')]} />);
    const link = screen.getByRole('link', { name: /riley martinez/i });
    expect(link).toHaveAttribute('href', '/boxers/boxer-1');
  });

  it('shows connections count in header', () => {
    wrap(<ConnectionsCard connections={[mkConn('b1', 'Alice'), mkConn('b2', 'Bob')]} totalCount={2} />);
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('shows overflow count when more than 6 connections', () => {
    const conns = Array.from({ length: 7 }, (_, i) => mkConn(`b${i}`, `Boxer ${i}`));
    wrap(<ConnectionsCard connections={conns} totalCount={7} />);
    expect(screen.getByText(/\+1 more/i)).toBeInTheDocument();
  });

  it('renders skeleton loading state', () => {
    const { container } = wrap(<ConnectionsCard connections={[]} isLoading={true} />);
    // Skeleton elements are present when loading (animate-pulse class)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  describe('pending requests', () => {
    const mkReq = (id: string): ConnectionRequest => ({
      id,
      requesterBoxerId: `boxer-${id}`,
      targetBoxerId: 'me',
      status: 'PENDING' as const,
      message: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      requesterBoxer: {
        id: `boxer-${id}`,
        name: 'Pending Boxer',
        profilePhotoUrl: null,
        experienceLevel: 'BEGINNER' as const,
        city: null,
        country: null,
        wins: 0,
        losses: 0,
        draws: 0,
        user: { id: `u-${id}`, name: 'Pending Boxer' },
      },
    });

    it('shows "Pending Requests" section header', () => {
      wrap(
        <ConnectionsCard
          connections={[]}
          isOwner={true}
          incomingRequests={[mkReq('r1')]}
        />
      );
      expect(screen.getByText(/pending requests/i)).toBeInTheDocument();
    });

    it('shows the requester boxer name', () => {
      wrap(
        <ConnectionsCard
          connections={[]}
          isOwner={true}
          incomingRequests={[mkReq('r1')]}
        />
      );
      expect(screen.getByText('Pending Boxer')).toBeInTheDocument();
    });

    it('shows "pending" badge in the card title', () => {
      wrap(
        <ConnectionsCard
          connections={[]}
          isOwner={true}
          incomingRequests={[mkReq('r1')]}
        />
      );
      expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
    });

    it('calls onAccept with the request id when Accept button is clicked', () => {
      const onAccept = vi.fn();
      const req = mkReq('r1');
      wrap(
        <ConnectionsCard
          connections={[]}
          isOwner={true}
          incomingRequests={[req]}
          onAccept={onAccept}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /accept connection from/i }));
      expect(onAccept).toHaveBeenCalledWith('r1');
    });

    it('calls onDecline with the request id when Decline button is clicked', () => {
      const onDecline = vi.fn();
      const req = mkReq('r1');
      wrap(
        <ConnectionsCard
          connections={[]}
          isOwner={true}
          incomingRequests={[req]}
          onDecline={onDecline}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /decline connection from/i }));
      expect(onDecline).toHaveBeenCalledWith('r1');
    });
  });

  describe('connections with missing boxer data', () => {
    it('shows "No connections yet" and does not crash when boxer is undefined', () => {
      const connWithoutBoxer = { ...mkConn('b-undef', 'Ghost Boxer'), boxer: undefined } as any;
      wrap(<ConnectionsCard connections={[connWithoutBoxer]} />);
      expect(screen.getByText(/no connections yet/i)).toBeInTheDocument();
    });
  });

  describe('disconnect confirmation', () => {
    it('shows confirm dialog after clicking remove button, and calls onDisconnect when confirmed', () => {
      const onDisconnect = vi.fn();
      const conn = mkConn('boxer-1', 'Riley Martinez');
      wrap(
        <ConnectionsCard
          connections={[conn]}
          isOwner={true}
          onDisconnect={onDisconnect}
        />
      );

      // The remove button is always in DOM but visually hidden via CSS (hidden group-hover:flex)
      const removeBtn = screen.getByRole('button', { name: /remove connection with riley martinez/i });
      fireEvent.click(removeBtn);

      // Confirm dialog should now appear
      expect(screen.getByText(/remove\?/i)).toBeInTheDocument();

      // Click the "Yes" button to confirm
      fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
      expect(onDisconnect).toHaveBeenCalledWith('boxer-1');
    });
  });
});
