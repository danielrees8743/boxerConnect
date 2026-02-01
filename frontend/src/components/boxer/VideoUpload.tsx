import React, { useState, useRef, useCallback } from 'react';
import { Video, Upload, Loader2, X } from 'lucide-react';
import { Button, Alert, AlertDescription } from '@/components/ui';
import { boxerService } from '@/services/boxerService';
import { cn } from '@/lib/utils';
import type { BoxerVideo } from '@/types';

/**
 * Allowed video MIME types
 */
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

/**
 * Maximum file size in bytes (100MB)
 */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface VideoUploadProps {
  /** Current video count */
  currentCount: number;
  /** Maximum allowed videos */
  maxVideos: number;
  /** Callback when a video is uploaded */
  onVideoUploaded?: (video: BoxerVideo) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * VideoUpload component for uploading training videos.
 * Features:
 * - Click or drag-and-drop to select file
 * - File validation (size and type)
 * - Upload progress indicator
 * - Video preview before upload
 * - Loading states and error handling
 */
export const VideoUpload: React.FC<VideoUploadProps> = ({
  currentCount,
  maxVideos,
  onVideoUploaded,
  disabled = false,
  className,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAtLimit = currentCount >= maxVideos;
  const isDisabled = disabled || isUploading || isAtLimit;

  /**
   * Validate file type and size
   */
  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please use MP4, WebM, MOV, or AVI.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 100MB.';
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
   * Handle click on the upload area to trigger file input
   */
  const handleClick = useCallback(() => {
    if (isDisabled) return;
    fileInputRef.current?.click();
  }, [isDisabled]);

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!isDisabled) {
        setIsDragOver(true);
      }
    },
    [isDisabled]
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

      if (isDisabled) return;

      const file = event.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [isDisabled, handleFileSelect]
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
    setUploadProgress(0);
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
    setUploadProgress(0);

    // Simulate progress (actual progress would require XHR or fetch with ReadableStream)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const result = await boxerService.uploadVideo(selectedFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onVideoUploaded?.(result);
    } catch (err) {
      clearInterval(progressInterval);
      const message = err instanceof Error ? err.message : 'Failed to upload video';
      setError(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, previewUrl, onVideoUploaded]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      {!selectedFile && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 p-8 rounded-lg',
            'border-2 border-dashed transition-all duration-200 cursor-pointer',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
            isDisabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <Video className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">
              {isAtLimit
                ? 'Video limit reached'
                : 'Click or drag to upload a video'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isAtLimit
                ? `Maximum of ${maxVideos} videos allowed`
                : `MP4, WebM, MOV, or AVI. Max 100MB.`}
            </p>
          </div>
        </div>
      )}

      {/* Preview */}
      {selectedFile && previewUrl && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              src={previewUrl}
              controls
              className="w-full max-h-64 object-contain"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              <span className="font-medium">{selectedFile.name}</span>
              <span className="mx-2">-</span>
              <span>{formatFileSize(selectedFile.size)}</span>
            </div>
          </div>

          {/* Progress bar during upload */}
          {isUploading && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading... {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Video
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelSelection}
              disabled={isUploading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={isDisabled}
      />

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Video count */}
      <p className="text-sm text-muted-foreground text-center">
        {currentCount} / {maxVideos} videos uploaded
      </p>
    </div>
  );
};

export default VideoUpload;
