import { LocalFilesystemAdapter } from './local-filesystem-adapter';
import { VercelBlobAdapter } from './vercel-blob-adapter';
import type { StorageAdapter } from './types';

let storageAdapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!storageAdapter) {
    // Use Vercel Blob in production (when BLOB_READ_WRITE_TOKEN is set)
    // Use Local Filesystem in development
    const useVercelBlob = process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV === 'production';
    
    if (useVercelBlob) {
      storageAdapter = new VercelBlobAdapter();
    } else {
      storageAdapter = new LocalFilesystemAdapter();
    }
  }
  return storageAdapter;
}

export * from './types';
