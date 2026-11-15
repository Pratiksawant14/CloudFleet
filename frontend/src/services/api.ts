import {
  KioskState,
  FleetSummary,
  CampaignManifest,
  SyncHistoryRecord,
} from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.port === '3000' ? 'http://localhost:4000' : '');

export class ApiService {
  static getBaseUrl(): string {
    return API_BASE_URL || window.location.origin;
  }

  static async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
    return res.json();
  }

  static async getFleet(): Promise<FleetSummary> {
    const res = await fetch(`${API_BASE_URL}/kiosks`);
    if (!res.ok) throw new Error(`Failed to fetch kiosks: ${res.statusText}`);
    return res.json();
  }

  static async getKiosk(kioskId: string): Promise<KioskState> {
    const res = await fetch(`${API_BASE_URL}/kiosks/${kioskId}`);
    if (!res.ok) throw new Error(`Failed to fetch kiosk: ${res.statusText}`);
    return res.json();
  }

  static async registerKiosk(data: {
    kioskId: string;
    name: string;
    kioskType?: string;
    location?: string;
  }): Promise<KioskState> {
    const res = await fetch(`${API_BASE_URL}/kiosks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to register kiosk (${res.status})`);
    }
    return res.json();
  }

  static async getCampaigns(): Promise<CampaignManifest[]> {
    const res = await fetch(`${API_BASE_URL}/campaigns`);
    if (!res.ok) throw new Error(`Failed to fetch campaigns: ${res.statusText}`);
    const data = await res.json();
    return data.campaigns || [];
  }

  static async createCampaign(data: {
    name: string;
    version: string;
    themeColor?: string;
    headline: string;
    description?: string;
    targetKiosks?: string[];
    assets?: Array<{
      filename: string;
      mediaType: 'IMAGE' | 'VIDEO' | 'HTML_BUNDLE';
      sizeBytes: number;
    }>;
  }): Promise<CampaignManifest> {
    const res = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to publish campaign (${res.status})`);
    }
    return res.json();
  }

  static async uploadAsset(data: {
    filename: string;
    fileData: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'HTML_BUNDLE';
  }): Promise<{
    assetId: string;
    filename: string;
    mediaType: 'IMAGE' | 'VIDEO' | 'HTML_BUNDLE';
    sizeBytes: number;
    url: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/assets/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to upload asset (${res.status})`);
    }
    return res.json();
  }

  static async getSyncHistory(kioskId: string): Promise<SyncHistoryRecord[]> {
    const res = await fetch(`${API_BASE_URL}/kiosks/${kioskId}/history`);
    if (!res.ok) throw new Error(`Failed to fetch history: ${res.statusText}`);
    const data = await res.json();
    return data.history || [];
  }
}
