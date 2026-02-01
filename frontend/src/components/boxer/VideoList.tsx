import React, { useState } from 'react';
import { format } from 'date-fns';
import { Video, Trash2, Loader2, Play, FileVideo } from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  Alert,
  AlertDescription,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Skeleton,
} from '@/components/ui';
import { boxerService } from '@/services/boxerService';
import { cn } from '@/lib/utils';
import type { BoxerVideo } from '@/types';

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface VideoListProps {
  /** List of videos to display */
  videos: BoxerVideo[];
  /** Whether the current user owns these videos */
  isOwner?: boolean;
  /** Callback when a video is deleted */
  onVideoDeleted?: (videoId: string) => void;
  /** Whether the list is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * VideoList component displays a list of boxer training videos.
 * Features:
 * - Video player for each video
 * - Delete option for owned videos
 * - Confirmation dialog before delete
 * - Loading and empty states
 */
export const VideoList: React.FC<VideoListProps> = ({
  videos,
  isOwner = false,
  onVideoDeleted,
  isLoading = false,
  className,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  /**
   * Handle video deletion
   */
  const handleDelete = async (videoId: string) => {
    setDeletingId(videoId);
    setError(null);

    try {
      await boxerService.deleteVideo(videoId);
      onVideoDeleted?.(videoId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete video';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <VideoListSkeleton />;
  }

  if (videos.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <FileVideo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          {isOwner
            ? 'No videos uploaded yet. Add your first training video!'
            : 'No training videos available.'}
        </p>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            {/* Video Player/Thumbnail */}
            <div className="relative bg-black aspect-video">
              {playingId === video.id ? (
                <video
                  src={video.url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  onEnded={() => setPlayingId(null)}
                />
              ) : (
                <button
                  onClick={() => setPlayingId(video.id)}
                  className="w-full h-full flex items-center justify-center group hover:bg-black/80 transition-colors"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-4 group-hover:bg-white group-hover:scale-110 transition-all">
                      <Play className="h-8 w-8 text-black fill-black" />
                    </div>
                  </div>
                  <Video className="h-16 w-16 text-muted-foreground/30" />
                </button>
              )}
            </div>

            {/* Video Info */}
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate" title={video.filename}>
                    {video.filename}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(video.size)}</span>
                    <span>-</span>
                    <span>{format(new Date(video.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                {isOwner && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === video.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        {deletingId === video.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Video</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete this video? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(video.id)}
                        >
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton loading state for VideoList
 */
function VideoListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-video" />
          <CardContent className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default VideoList;
