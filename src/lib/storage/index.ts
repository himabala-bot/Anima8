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
    
  }

  getUrl(path: string): string {
    return path;
  }
}

export const assetStorage: IAssetStorage = new LocalAssetStorage();
