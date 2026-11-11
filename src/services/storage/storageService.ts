import { getSupabaseClient } from '@/lib/supabaseClient';
import { AppServiceError } from '@/services/api/errors';

const CLUB_LOGOS_BUCKET = 'club-logos';
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

async function compressRasterLogo(file: File): Promise<Blob> {
  if (file.type === 'image/svg+xml' || file.size <= 200 * 1024) {
    return file;
  }
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 512;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const outputType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    const compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputType, 0.88);
    });

    if (compressed && compressed.size < file.size) {
      return compressed;
    }
    return file;
  } catch {
    return file;
  }
}

function getFileExtension(file: File, blobType: string): string {
  if (blobType === 'image/svg+xml' || file.type === 'image/svg+xml') return 'svg';
  if (blobType === 'image/webp') return 'webp';
  if (blobType === 'image/jpeg') return 'jpg';
  return 'png';
}

export interface UploadedAssetResult {
  publicUrl: string;
  path: string;
}

export const storageService = {
  validateLogoFile(file: File): void {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new AppServiceError(
        'INVALID_FILE_TYPE',
        'Only PNG, JPEG, WebP, and SVG logos are allowed.',
        400,
      );
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new AppServiceError(
        'FILE_TOO_LARGE',
        'Logo file must be 2MB or smaller.',
        400,
      );
    }
  },

  async uploadClubLogo(file: File, previousPath?: string | null): Promise<UploadedAssetResult> {
    this.validateLogoFile(file);
    const supabase = getSupabaseClient();

    const uploadPayload = await compressRasterLogo(file);
    const contentType = uploadPayload.type || file.type;
    const ext = getFileExtension(file, contentType);
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const filePath = `logos/club-logo-${Date.now()}-${randomSuffix}.${ext}`;

    const { error } = await supabase.storage
      .from(CLUB_LOGOS_BUCKET)
      .upload(filePath, uploadPayload, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new AppServiceError('UNKNOWN_ERROR', error.message);
    }

    if (previousPath && previousPath.startsWith('logos/')) {
      void supabase.storage.from(CLUB_LOGOS_BUCKET).remove([previousPath]);
    }

    const { data: urlData } = supabase.storage.from(CLUB_LOGOS_BUCKET).getPublicUrl(filePath);
    return {
      publicUrl: urlData.publicUrl,
      path: filePath,
    };
  },

  async deleteClubLogo(path?: string | null): Promise<void> {
    if (!path || !path.startsWith('logos/')) return;
    const supabase = getSupabaseClient();
    await supabase.storage.from(CLUB_LOGOS_BUCKET).remove([path]);
  },
};
