/**
 * Object Storage Interface for Anim8 Studio
 * Decouples heavy binary asset storage (audio, reference images, thumbnails, export renders)
 * from the relational Neon PostgreSQL database.
 */

export interface AssetUploadResult {
  storagePath: string;
  url?: string;
  sizeBytes: number;
  mimeType: string;
}

export interface IAssetStorage {
  upload(
    path: string,
    data: Blob | string,
    mimeType: string
  ): Promise<AssetUploadResult>;
  download(path: string): Promise<Blob | string | null>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

/**
 * Local / Browser-side Asset Storage Implementation
 * Holds asset references locally while offline, ready to pipe to S3/R2/Supabase storage in cloud mode.
 */
export class LocalAssetStorage implements IAssetStorage {
  async upload(
    path: string,
    data: Blob | string,
    mimeType: string
  ): Promise<AssetUploadResult> {
    const sizeBytes = typeof data === 'string' ? data.length : data.size;
    return {
      storagePath: path,
      url: typeof data === 'string' ? data : URL.createObjectURL(data),
      sizeBytes,
      mimeType,
    };
  }

  async download(path: string): Promise<Blob | string | null> {
    return path;
  }

  async delete(_path: string): Promise<void> {
    // Local no-op
  }

  getUrl(path: string): string {
    return path;
  }
}

export const assetStorage: IAssetStorage = new LocalAssetStorage();
