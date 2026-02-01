// Storage Service Module Exports
// Factory and interface exports for storage abstraction

export type { StorageService, StorageResult, UploadOptions } from './storage.interface';
export { localStorageService } from './localStorage.service';
export { supabaseStorageService } from './supabaseStorage.service';

// ============================================================================
// Storage Service Factory
// ============================================================================

import { localStorageService } from './localStorage.service';
import { supabaseStorageService } from './supabaseStorage.service';
import type { StorageService } from './storage.interface';

/**
 * Storage provider types
 * Extend this enum when adding new storage providers (e.g., S3, GCS)
 */
export type StorageProvider = 'local' | 'supabase' | 's3';

/**
 * Get the storage service instance
 * Supports local and Supabase storage; extend for other providers
 * @param provider - Storage provider type (default: 'local')
 * @returns StorageService implementation
 */
export function getStorageService(provider: StorageProvider = 'local'): StorageService {
  switch (provider) {
    case 'local':
      return localStorageService;
    case 'supabase':
      return supabaseStorageService;
    case 's3':
      // TODO: Implement S3 storage service
      throw new Error('S3 storage not yet implemented');
    default:
      return localStorageService;
  }
}

/**
 * Get storage provider from environment variable
 * Defaults to 'local' if STORAGE_PROVIDER is not set
 */
function getStorageProvider(): StorageProvider {
  const provider = process.env['STORAGE_PROVIDER'] as StorageProvider | undefined;
  return provider && ['local', 'supabase', 's3'].includes(provider) ? provider : 'local';
}

/**
 * Default storage service instance
 * Uses provider specified in STORAGE_PROVIDER env variable (defaults to 'local')
 */
export const storageService = getStorageService(getStorageProvider());

export default storageService;
