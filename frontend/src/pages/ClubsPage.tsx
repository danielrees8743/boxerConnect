import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, MapPin, Users, CheckCircle2 } from 'lucide-react';
import { clubService, type ClubStats } from '@/services/clubService';
import type { Club } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * ClubsPage for browsing Welsh Boxing clubs.
 * Public page - no authentication required.
 */
export const ClubsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clubs, setClubs] = React.useState<Club[]>([]);
  const [regions, setRegions] = React.useState<string[]>([]);
  const [stats, setStats] = React.useState<ClubStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedRegion, setSelectedRegion] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const limit = 20;

  // Fetch initial data
  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [regionsData, statsData] = await Promise.all([
          clubService.getRegions(),
          clubService.getStats(),
        ]);
        setRegions(regionsData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch clubs when filters change
  React.useEffect(() => {
    const fetchClubs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params: Record<string, string | number> = { page, limit };
        if (searchQuery) params.name = searchQuery;
        if (selectedRegion && selectedRegion !== 'all') params.region = selectedRegion;

        const response = await clubService.getClubs(params);
        setClubs(response.data);
        setTotalPages(response.pagination.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load clubs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClubs();
  }, [searchQuery, selectedRegion, page]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  // Handle region change
  const handleRegionChange = (value: string) => {
    setSelectedRegion(value);
    setPage(1);
  };

  // Handle reset
  const handleReset = () => {
    setSearchQuery('');
    setSelectedRegion('all');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Welsh Boxing Clubs
        </h1>
        <p className="text-muted-foreground mt-1">
          Find affiliated boxing clubs across Wales
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Clubs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          {stats.byRegion.map((r) => (
            <Card key={r.region}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {r.region}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{r.count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Clubs</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by club name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedRegion} onValueChange={handleRegionChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Clubs List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : clubs.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No clubs found matching your criteria.</p>
          </div>
        ) : (
          clubs.map((club) => (
            <Card
              key={club.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/clubs/${club.id}`)}
            >
              <CardHeader className="p-0">
                {/* Banner Photo (if available) */}
                {club.photos && club.photos.length > 0 && (
                  <div className="w-full h-32 overflow-hidden rounded-t-lg">
                    <img
                      src={club.photos[0]}
                      alt={club.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6 pb-0">
                  <div className="flex items-start gap-3">
                    {/* Profile Photo (if available, otherwise show default) */}
                    {club.photos && club.photos.length > 1 ? (
                      <img
                        src={club.photos[1]}
                        alt={club.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-background"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{club.name}</CardTitle>
                      {club.region && (
                        <CardDescription>
                          <Badge variant="secondary" className="mt-1">
                            {club.region}
                          </Badge>
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {/* Description Preview */}
                {club.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {club.description.length > 100
                      ? `${club.description.substring(0, 100)}...`
                      : club.description}
                  </p>
                )}

                {/* Specialties Badges */}
                {club.specialties && club.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {club.specialties.slice(0, 3).map((specialty, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                    {club.specialties.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{club.specialties.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Amenities/Facilities Badges */}
                {club.amenities && club.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {club.amenities.slice(0, 4).map((amenity, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {club.amenities.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{club.amenities.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-2 text-sm pt-2 border-t">
                  {club.acceptingMembers && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Accepting Members</span>
                    </div>
                  )}
                  {club.contactName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{club.contactName}</span>
                    </div>
                  )}
                  {club.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${club.email}`}
                        className="text-primary hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {club.email}
                      </a>
                    </div>
                  )}
                  {club.postcode && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{club.postcode}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClubsPage;
