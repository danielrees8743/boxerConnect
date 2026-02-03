/**
 * ClubDetailPage Component Tests
 * Tests for enhanced club profile display
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ClubDetailPage } from '../ClubDetailPage';
import { clubService } from '@/services/clubService';
import type { Club } from '@/types';

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock('@/services/clubService', () => ({
  clubService: {
    getClub: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'club-123' }),
    useNavigate: () => vi.fn(),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

const createMockClub = (overrides: Partial<Club> = {}): Club => ({
  id: 'club-123',
  name: 'Elite Boxing Academy',
  email: 'contact@eliteboxing.com',
  phone: '+44 20 1234 5678',
  contactName: 'Jane Smith',
  postcode: 'SW1A 1AA',
  region: 'London',
  address: '456 Boxing Street',
  city: 'London',
  country: 'United Kingdom',
  latitude: 51.5074,
  longitude: -0.1278,
  description: 'Premier boxing academy with state-of-the-art facilities',
  website: 'https://eliteboxing.com',
  facebookUrl: 'https://facebook.com/eliteboxing',
  instagramUrl: 'https://instagram.com/eliteboxing',
  twitterUrl: 'https://twitter.com/eliteboxing',
  foundedYear: 1995,
  capacity: 100,
  amenities: ['Professional Ring', 'Heavy Bags', 'Speed Bags', 'Showers', 'Parking'],
  photos: ['https://example.com/gym1.jpg', 'https://example.com/gym2.jpg'],
  operatingHours: {
    monday: { open: '06:00', close: '22:00' },
    tuesday: { open: '06:00', close: '22:00' },
    wednesday: { open: '06:00', close: '22:00' },
    thursday: { open: '06:00', close: '22:00' },
    friday: { open: '06:00', close: '22:00' },
    saturday: { open: '08:00', close: '18:00' },
    sunday: { closed: true },
  },
  pricingTiers: [
    {
      name: 'Basic',
      price: 50,
      currency: 'GBP',
      period: 'monthly',
      description: 'Basic membership with gym access',
    },
    {
      name: 'Premium',
      price: 100,
      currency: 'GBP',
      period: 'monthly',
      description: 'Premium membership with coaching included',
    },
  ],
  specialties: ['Olympic Boxing', 'Professional Training', 'Youth Development'],
  ageGroupsServed: ['Youth (12-17)', 'Adults (18+)', 'Seniors (50+)'],
  achievements: ['National Champions 2020', 'Regional Winners 2019'],
  affiliations: ['British Boxing Federation', 'London Boxing Association'],
  certifications: ['SafeSport Certified', 'First Aid Certified'],
  languages: ['English', 'Spanish', 'Polish'],
  accessibility: ['Wheelchair Access', 'Disabled Parking', 'Elevator'],
  headCoachName: 'Mike Johnson',
  headCoachBio: '20 years of professional coaching experience',
  headCoachPhotoUrl: 'https://example.com/coach.jpg',
  parkingInfo: 'Free parking available for members',
  publicTransportInfo: 'Close to Westminster station',
  acceptingMembers: true,
  isPublished: true,
  isVerified: true,
  ownerId: 'owner-123',
  createdAt: new Date('2020-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  ...overrides,
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// ============================================================================
// Test Suites
// ============================================================================

describe('ClubDetailPage - Rendering Complete Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Full Profile Display Tests
  // ==========================================================================

  it('should render club profile with all sections', async () => {
    const fullClub = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(fullClub);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Basic info
    expect(screen.getByText(/Premier boxing academy/i)).toBeInTheDocument();
    expect(screen.getByText(/contact@eliteboxing.com/i)).toBeInTheDocument();
    expect(screen.getByText(/\+44 20 1234 5678/i)).toBeInTheDocument();

    // Location
    expect(screen.getByText(/456 Boxing Street/i)).toBeInTheDocument();
    expect(screen.getAllByText(/London/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/SW1A 1AA/i)).toBeInTheDocument();
  });

  it('should display operating hours section', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Check for operating hours
    expect(screen.getByText(/monday/i)).toBeInTheDocument();
    expect(screen.getAllByText(/06:00/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/22:00/i)).toBeInTheDocument();
  });

  it('should display pricing tiers section', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Check for pricing tiers
    expect(screen.getAllByText(/Basic/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Premium/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/50/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
  });

  it('should display amenities section', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Check for amenities
    expect(screen.getByText(/Professional Ring/i)).toBeInTheDocument();
    expect(screen.getByText(/Heavy Bags/i)).toBeInTheDocument();
    expect(screen.getByText(/Showers/i)).toBeInTheDocument();
  });

  it('should display specialties section', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Check for specialties
    expect(screen.getByText(/Olympic Boxing/i)).toBeInTheDocument();
    expect(screen.getByText(/Professional Training/i)).toBeInTheDocument();
  });

  it('should display achievements section', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Check for achievements
    expect(screen.getByText(/National Champions 2020/i)).toBeInTheDocument();
  });

  it('should display head coach section', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Check for head coach
    expect(screen.getByText(/Mike Johnson/i)).toBeInTheDocument();
    expect(screen.getByText(/20 years of professional coaching/i)).toBeInTheDocument();
  });

  it('should display social media links', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Check for social media links (links should be present)
    const links = screen.getAllByRole('link');
    const facebookLink = links.find(link =>
      link.getAttribute('href')?.includes('facebook.com')
    );
    const instagramLink = links.find(link =>
      link.getAttribute('href')?.includes('instagram.com')
    );
    const twitterLink = links.find(link =>
      link.getAttribute('href')?.includes('twitter.com')
    );

    expect(facebookLink).toBeTruthy();
    expect(instagramLink).toBeTruthy();
    expect(twitterLink).toBeTruthy();
  });
});

describe('ClubDetailPage - Handling Missing Optional Fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Graceful Degradation Tests
  // ==========================================================================

  it('should handle missing optional fields gracefully', async () => {
    const minimalClub = createMockClub({
      description: undefined,
      email: undefined,
      phone: undefined,
      website: undefined,
      facebookUrl: undefined,
      instagramUrl: undefined,
      twitterUrl: undefined,
      amenities: [],
      photos: [],
      operatingHours: undefined,
      pricingTiers: [],
      specialties: [],
      achievements: [],
      headCoachName: undefined,
      headCoachBio: undefined,
    });

    (clubService.getClub as Mock).mockResolvedValue(minimalClub);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Page should still render successfully
    expect(screen.queryByText(/Premier boxing academy/i)).not.toBeInTheDocument();
  });

  it('should handle null operating hours', async () => {
    const club = createMockClub({
      operatingHours: null,
    });

    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Should not crash
    expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
  });

  it('should handle empty pricing tiers array', async () => {
    const club = createMockClub({
      pricingTiers: [],
    });

    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Should not crash with empty pricing
    expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
  });

  it('should handle empty amenities array', async () => {
    const club = createMockClub({
      amenities: [],
    });

    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Should not crash with empty amenities
    expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
  });

  it('should handle missing head coach information', async () => {
    const club = createMockClub({
      headCoachName: undefined,
      headCoachBio: undefined,
      headCoachPhotoUrl: undefined,
    });

    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Should not display coach section
    expect(screen.queryByText(/Mike Johnson/i)).not.toBeInTheDocument();
  });
});

describe('ClubDetailPage - Empty States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Empty State Display Tests
  // ==========================================================================

  it('should display empty state for unpopulated sections', async () => {
    const club = createMockClub({
      amenities: [],
      specialties: [],
      achievements: [],
      photos: [],
    });

    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Should still render the page successfully
    expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
  });

  it('should handle clubs with no photos', async () => {
    const club = createMockClub({
      photos: [],
    });

    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Should not crash without photos
    expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
  });

  it('should handle clubs with single photo', async () => {
    const club = createMockClub({
      photos: ['https://example.com/single-photo.jpg'],
    });

    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Should render successfully with one photo
    expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
  });
});

describe('ClubDetailPage - Loading and Error States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  it('should display loading skeleton while fetching data', () => {
    (clubService.getClub as Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<ClubDetailPage />);

    // Should show skeleton loaders
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ==========================================================================
  // Error State Tests
  // ==========================================================================

  it('should display error message when club not found', async () => {
    (clubService.getClub as Mock).mockRejectedValue(new Error('Club not found'));

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Club not found/i)).toBeInTheDocument();
    });
  });

  it('should display error message on network failure', async () => {
    (clubService.getClub as Mock).mockRejectedValue(new Error('Network error'));

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('should display back button on error', async () => {
    (clubService.getClub as Mock).mockRejectedValue(new Error('Failed to load'));

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      const backButton = screen.getByRole('button', { name: /back to clubs/i });
      expect(backButton).toBeInTheDocument();
    });
  });

  it('should handle null club response', async () => {
    (clubService.getClub as Mock).mockResolvedValue(null);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Club not found/i)).toBeInTheDocument();
    });
  });
});

describe('ClubDetailPage - Contact and Location Information', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Contact Information Display
  // ==========================================================================

  it('should display all contact information', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    expect(screen.getByText(/contact@eliteboxing.com/i)).toBeInTheDocument();
    expect(screen.getByText(/\+44 20 1234 5678/i)).toBeInTheDocument();
  });

  it('should display full address', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    expect(screen.getByText(/456 Boxing Street/i)).toBeInTheDocument();
    expect(screen.getAllByText(/London/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/United Kingdom/i)).toBeInTheDocument();
    expect(screen.getByText(/SW1A 1AA/i)).toBeInTheDocument();
  });

  it('should handle missing contact email', async () => {
    const club = createMockClub({
      email: undefined,
    });

    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Should not display email field
    expect(screen.queryByText(/contact@eliteboxing.com/i)).not.toBeInTheDocument();
  });

  it('should handle missing contact phone', async () => {
    const club = createMockClub({
      phone: undefined,
    });

    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    // Should not display phone field
    expect(screen.queryByText(/\+44 20 1234 5678/i)).not.toBeInTheDocument();
  });
});

describe('ClubDetailPage - Accessibility and Transportation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Accessibility Features
  // ==========================================================================

  it('should display accessibility features', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    expect(screen.getByText(/Wheelchair Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Disabled Parking/i)).toBeInTheDocument();
  });

  it('should display parking information', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    expect(screen.getByText(/Free parking available/i)).toBeInTheDocument();
  });

  it('should display public transport information', async () => {
    const club = createMockClub();
    (clubService.getClub as Mock).mockResolvedValue(club);

    renderWithRouter(<ClubDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Elite Boxing Academy')).toBeInTheDocument();
    });

    expect(screen.getByText(/Close to Westminster station/i)).toBeInTheDocument();
  });
});
