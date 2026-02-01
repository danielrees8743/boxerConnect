// Storage Service Module Exports
// Factory and interface exports for storage abstraction

export type { StorageService, StorageResult, UploadOptions } from './storage.interface';
export { localStorageService } from './localStorage.service';

// ============================================================================
// Storage Service Factory
// ============================================================================

import { localStorageService } from './localStorage.service';
import type { StorageService } from './storage.interface';

/**
 * Storage provider types
 * Extend this enum when adding new storage providers (e.g., S3, GCS)
 */
export type StorageProvider = 'local' | 's3';

/**
 * Get the storage service instance
 * Currently returns local storage; extend for other providers
 * @param provider - Storage provider type (default: 'local')
 * @returns StorageService implementation
 */
export function getStorageService(provider: StorageProvider = 'local'): StorageService {
  switch (provider) {
    case 'local':
      return localStorageService;
    case 's3':
      // TODO: Implement S3 storage service
      throw new Error('S3 storage not yet implemented');
    default:
      return localStorageService;
  }
}

/**
 * Default storage service instance
 * Uses local storage for now
 */
export const storageService = getStorageService('local');

export default storageService;
