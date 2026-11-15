import { getStorageProvider, getMimeType } from './storage.js';
import { randomUUID } from 'crypto';
import { Logger } from '../utils/logger.js';

export interface UploadedAssetResult {
  assetId: string;
  filename: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'HTML_BUNDLE';
  sizeBytes: number;
  url: string;
}

export class AssetService {
  static async uploadAsset(input: {
    filename: string;
    fileData: string; // base64 or data URL
    mediaType?: 'IMAGE' | 'VIDEO' | 'HTML_BUNDLE';
    baseUrl?: string;
  }): Promise<UploadedAssetResult> {
    const { filename, fileData, baseUrl = '' } = input;
    if (!filename || !fileData) {
      throw new Error('Filename and fileData are required for asset upload.');
    }

    // Strip base64 data URL prefix if present (e.g. data:image/png;base64,....)
    const base64Data = fileData.includes(';base64,')
      ? fileData.split(';base64,')[1]
      : fileData;

    const buffer = Buffer.from(base64Data, 'base64');
    const sizeBytes = buffer.length;

    // Detect media type if not provided
    const mime = getMimeType(filename);
    const mediaType: 'IMAGE' | 'VIDEO' | 'HTML_BUNDLE' =
      input.mediaType || (mime.startsWith('video') ? 'VIDEO' : 'IMAGE');

    const sanitizedFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageKey = `assets/${sanitizedFilename}`;

    const storage = getStorageProvider();
    await storage.putBuffer(storageKey, buffer, mime);

    Logger.info('ASSET_UPLOADED_TO_S3', `Saved asset ${sanitizedFilename} (${(sizeBytes / 1024).toFixed(1)} KB) to S3 object store`, {
      details: { storageKey, sizeBytes, mediaType },
    });

    const assetId = `ast_${randomUUID().slice(0, 8)}`;

    const isAwsS3 = !!process.env.S3_BUCKET_NAME && process.env.USE_LOCAL_STORAGE !== 'true';
    const region = process.env.AWS_REGION || 'us-east-1';
    const url = isAwsS3
      ? `https://${process.env.S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${storageKey}`
      : `${baseUrl.replace(/\/+$/, '')}/assets/${sanitizedFilename}`;

    return {
      assetId,
      filename: sanitizedFilename,
      mediaType,
      sizeBytes,
      url,
    };
  }

  static async getAsset(filename: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const storage = getStorageProvider();
    const result = await storage.getBuffer(`assets/${filename}`);
    if (!result) return null;
    return {
      buffer: result.buffer,
      contentType: result.contentType || getMimeType(filename),
    };
  }

  static async seedDefaultAssets(baseUrl = 'http://localhost:4000'): Promise<{ welcomeUrl: string; promoUrl: string }> {
    const storage = getStorageProvider();

    // 1. High-impact Welcome Retail Banner SVG
    const welcomeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <circle cx="1050" cy="150" r="280" fill="#38bdf8" opacity="0.12"/>
  <circle cx="150" cy="550" r="320" fill="#818cf8" opacity="0.15"/>
  <rect x="80" y="80" width="1040" height="515" rx="24" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
  <rect x="120" y="120" width="180" height="38" rx="8" fill="#38bdf8" opacity="0.2"/>
  <text x="210" y="145" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="2">STORE DISPLAY</text>
  <text x="120" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900" fill="#ffffff" letter-spacing="-1">NEW SEASON</text>
  <text x="120" y="350" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900" fill="url(#accent)" letter-spacing="-1">COLLECTION 2026</text>
  <text x="120" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="400" fill="#94a3b8">Discover the latest arrivals in store • Exclusive premium quality</text>
  <rect x="120" y="470" width="220" height="56" rx="12" fill="url(#accent)"/>
  <text x="230" y="506" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#0f172a" text-anchor="middle">EXPLORE IN STORE</text>
</svg>`;

    // 2. High-impact Flash Sale Banner SVG
    const saleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="saleBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#450a0a"/>
      <stop offset="50%" stop-color="#7f1d1d"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#saleBg)"/>
  <circle cx="950" cy="337" r="320" fill="#f59e0b" opacity="0.18"/>
  <rect x="80" y="80" width="1040" height="515" rx="24" fill="none" stroke="rgba(254, 226, 226, 0.2)" stroke-width="3"/>
  <rect x="120" y="120" width="220" height="42" rx="8" fill="#f59e0b" opacity="0.25"/>
  <text x="230" y="148" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="#fde047" text-anchor="middle" letter-spacing="3">LIMITED TIME PROMO</text>
  <text x="120" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="76" font-weight="900" fill="#ffffff" letter-spacing="-2">FLASH SALE</text>
  <text x="120" y="375" font-family="system-ui, -apple-system, sans-serif" font-size="88" font-weight="900" fill="url(#gold)" letter-spacing="-3">UP TO 50% OFF</text>
  <text x="120" y="445" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="500" fill="#fecaca">Valid across all footwear, activewear & accessories this week only</text>
</svg>`;

    await storage.putBuffer('assets/welcome_screen_ad.svg', Buffer.from(welcomeSvg, 'utf8'), 'image/svg+xml');
    await storage.putBuffer('assets/flash_sale_poster.svg', Buffer.from(saleSvg, 'utf8'), 'image/svg+xml');

    return {
      welcomeUrl: `${baseUrl}/assets/welcome_screen_ad.svg`,
      promoUrl: `${baseUrl}/assets/flash_sale_poster.svg`,
    };
  }
}
