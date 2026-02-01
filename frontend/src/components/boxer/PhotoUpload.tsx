import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Trash2, Upload, Loader2, X } from 'lucide-react';
import { Button, Alert, AlertDescription } from '@/components/ui';
import { boxerService } from '@/services/boxerService';
import { cn } from '@/lib/utils';

/**
 * Allowed image MIME types for profile photos
 */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Get initials from a name string
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface PhotoUploadProps {
  /** Current photo URL to display */
  currentPhotoUrl?: string | null;
  /** Name for initials avatar fallback */
  name?: string;
  /** Callback when photo changes (upload or remove) */
  onPhotoChange?: (newUrl: string | null) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PhotoUpload component for uploading and managing profile photos.
 * Features:
 * - Display current photo or initials avatar
 * - Click or drag-and-drop to select file
 * - Preview before upload
 * - File validation (size and type)
 * - Loading states and error handling
 *
 * @example
 * <PhotoUpload
 *   currentPhotoUrl={boxer?.profilePhotoUrl}
 *   name={boxer?.name}
 *   onPhotoChange={(url) => console.log('New photo URL:', url)}
 * />
 */
export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  currentPhotoUrl,
  name = '',
  onPhotoChange,
  disabled = false,
  className,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /**
   * Validate file type and size
   */
  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please use JPEG, PNG, WebP, or GIF.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 5MB.';
    }
    return null;
  }, []);

  /**
   * Handle file selection from input or drop
   */
  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setSelectedFile(file);

      // Create preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    },
    [validateFile]
  );

  /**
   * Handle input change event
   */
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  /**
   * Handle click on the photo area to trigger file input
   */
  const handleClick = useCallback(() => {
    if (disabled || isUploading || isRemoving) return;
    fileInputRef.current?.click();
  }, [disabled, isUploading, isRemoving]);

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled && !isUploading && !isRemoving) {
        setIsDragOver(true);
      }
    },
    [disabled, isUploading, isRemoving]
  );

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  /**
   * Handle drop event
   */
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      if (disabled || isUploading || isRemoving) return;

      const file = event.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, isUploading, isRemoving, handleFileSelect]
  );

  /**
   * Cancel the selected file and clear preview
   */
  const handleCancelSelection = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  /**
   * Upload the selected file
   */
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await boxerService.uploadProfilePhoto(selectedFile);

      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onPhotoChange?.(result.profilePhotoUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload photo';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, previewUrl, onPhotoChange]);

  /**
   * Remove the current photo
   */
  const handleRemove = useCallback(async () => {
    setIsRemoving(true);
    setError(null);

    try {
      await boxerService.removeProfilePhoto();
      onPhotoChange?.(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove photo';
      setError(message);
    } finally {
      setIsRemoving(false);
    }
  }, [onPhotoChange]);

  // Determine what to display in the avatar area
  const displayUrl = previewUrl || currentPhotoUrl;
  const hasCurrentPhoto = !!currentPhotoUrl && !previewUrl;
  const hasPreview = !!previewUrl;
  const initials = name ? getInitials(name) : '';
  const isLoading = isUploading || isRemoving;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-4">
        {/* Photo Area */}
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative h-24 w-24 rounded-full flex items-center justify-center overflow-hidden',
            'border-2 transition-all duration-200 cursor-pointer',
            'group',
            isDragOver
              ? 'border-primary border-dashed bg-primary/10'
              : displayUrl
                ? 'border-muted-foreground/25'
                : 'border-dashed border-muted-foreground/25 bg-muted',
            (disabled || isLoading) && 'cursor-not-allowed opacity-50'
          )}
        >
          {/* Current Photo or Preview */}
          {displayUrl ? (
            <>
              <img
                src={displayUrl}
                alt="Profile photo"
                className="h-full w-full object-cover"
              />
              {/* Hover overlay */}
              {!disabled && !isLoading && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              )}
            </>
          ) : initials ? (
            <>
              {/* Initials Avatar */}
              <span className="text-xl font-medium text-muted-foreground">
                {initials}
              </span>
              {/* Hover overlay */}
              {!disabled && !isLoading && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              )}
            </>
          ) : (
            /* Empty state with upload icon */
            <Upload className="h-8 w-8 text-muted-foreground/50" />
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {hasPreview ? (
            /* Preview mode actions */
            <>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleUpload}
                disabled={disabled || isLoading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelSelection}
                disabled={disabled || isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : (
            /* Normal mode actions */
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClick}
                disabled={disabled || isLoading}
              >
                <Camera className="mr-2 h-4 w-4" />
                {hasCurrentPhoto ? 'Change Photo' : 'Add Photo'}
              </Button>
              {hasCurrentPhoto && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={disabled || isLoading}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {isRemoving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Photo
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isLoading}
        />
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Helper text */}
      {!error && !hasPreview && (
        <p className="text-sm text-muted-foreground">
          Click or drag to upload. Max 5MB. JPEG, PNG, WebP, or GIF.
        </p>
      )}
    </div>
  );
};

export default PhotoUpload;
