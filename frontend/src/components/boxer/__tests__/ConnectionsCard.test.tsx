// ConnectionsCard Tests

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConnectionsCard } from '../ConnectionsCard';
import type { Connection } from '@/types';

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
});
