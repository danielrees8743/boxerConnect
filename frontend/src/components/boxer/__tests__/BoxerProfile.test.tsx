import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
