import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Zap,
  Clock,
  HardDrive,
  FileImage,
  Video,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { CampaignManifest } from '../types';
import { ApiService } from '../services/api';

interface CampaignLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignActivated: (name: string, version: string) => void;
  onOpenCreateCampaign: () => void;
}

export const CampaignLibraryModal: React.FC<CampaignLibraryModalProps> = ({
  isOpen,
  onClose,
  onCampaignActivated,
  onOpenCreateCampaign,
}) => {
  const [campaigns, setCampaigns] = useState<CampaignManifest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await ApiService.getCampaigns();
      setCampaigns(list);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load campaigns from S3.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // The first published campaign in the list is the active one (due to publishedAt desc sort)
  const activeCampaignId = campaigns.find((c) => c.status === 'PUBLISHED')?.campaignId;

  const handleActivate = async (campaign: CampaignManifest) => {
    try {
      setActivatingId(campaign.campaignId);
      setError(null);
      await ApiService.activateCampaign(campaign.campaignId);
      onCampaignActivated(campaign.name, campaign.version);
      await fetchCampaigns();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to re-activate campaign.');
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeactivate = async (campaign: CampaignManifest) => {
    try {
      setActivatingId(campaign.campaignId);
      setError(null);
      await ApiService.deactivateCampaign(campaign.campaignId);
      await fetchCampaigns();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to deactivate campaign.');
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '920px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'rgba(124, 58, 237, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a855f7',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Campaign Repository & S3 Storage
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                All previous & active campaigns. Re-activate past campaigns with 1 click — edge kiosks switch in ~15ms via local disk cache.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              onClick={fetchCampaigns}
              title="Refresh campaigns from S3"
              style={{ padding: '0.4rem 0.6rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
            <button className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Banner Info */}
        <div
          style={{
            margin: '1rem 0 0.5rem 0',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.8rem',
            color: '#93c5fd',
          }}
        >
          <Zap size={18} color="#38bdf8" style={{ flexShrink: 0 }} />
          <span>
            <strong>Edge Computing Advantage:</strong> When you re-activate an older campaign, edge displays check their local hard drive (<code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px' }}>.kiosk-cache</code>). If assets are already cached, kiosks <strong>bypass S3 download</strong> entirely, saving 100% cloud egress bandwidth and switching screens instantly!
          </span>
        </div>

        {error && (
          <div
            style={{
              margin: '0.5rem 0',
              padding: '0.6rem 0.85rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '0.8rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Campaigns List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {loading && campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
              <p>Scanning Amazon S3 bucket for campaign manifests...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <p>No campaigns found in S3 storage.</p>
              <button
                className="btn-primary"
                onClick={() => {
                  onClose();
                  onOpenCreateCampaign();
                }}
                style={{ marginTop: '0.5rem' }}
              >
                <UploadCloud size={14} />
                <span>Upload First Campaign</span>
              </button>
            </div>
          ) : (
            campaigns.map((camp) => {
              const isLive = camp.campaignId === activeCampaignId && camp.status === 'PUBLISHED';
              const isActivating = activatingId === camp.campaignId;
              const asset = camp.assets?.[0];
              const totalMb = (camp.assets?.reduce((sum, a) => sum + (a.sizeBytes || 0), 0) / (1024 * 1024)).toFixed(1);

              return (
                <div
                  key={camp.campaignId}
                  style={{
                    backgroundColor: isLive ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)',
                    border: isLive ? '1.5px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Left: Thumbnail & Visual preview */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '76px',
                        height: '56px',
                        borderRadius: '6px',
                        backgroundColor: '#0a0f1d',
                        border: '1px solid rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      {asset?.url ? (
                        asset.mediaType === 'VIDEO' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                            <Video size={20} color="#38bdf8" />
                            <span style={{ fontSize: '0.6rem' }}>VIDEO</span>
                          </div>
                        ) : (
                          <img
                            src={asset.url}
                            alt={camp.headline}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              // Fallback if image fails to render
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )
                      ) : (
                        <FileImage size={24} color="#64748b" />
                      )}
                    </div>

                    {/* Middle: Details */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            fontWeight: 700,
                          }}
                        >
                          v{camp.version}
                        </span>

                        <h3
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            margin: 0,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {camp.name}
                        </h3>

                        {isLive && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#10b981',
                              color: '#000000',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ShieldCheck size={12} />
                            Active Live
                          </span>
                        )}

                        {camp.status === 'ARCHIVED' && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                            }}
                          >
                            Archived
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          margin: '0 0 0.35rem 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        "{camp.headline}"
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <HardDrive size={11} />
                          {camp.assets?.length || 1} asset ({totalMb} MB)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} />
                          {camp.publishedAt ? new Date(camp.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Draft'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          ID: {camp.campaignId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {isLive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            color: '#10b981',
                            fontWeight: 600,
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Currently Live on Kiosks</span>
                        </div>
                        <button
                          className="btn-secondary"
                          onClick={() => handleDeactivate(camp)}
                          disabled={isActivating}
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: '#ef4444' }}
                          title="Deactivate this campaign"
                        >
                          Deactivate
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => handleActivate(camp)}
                        disabled={isActivating}
                        style={{
                          backgroundColor: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.45rem 1rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                        }}
                      >
                        <Zap size={14} />
                        <span>{isActivating ? 'Activating Fleet...' : 'Set as Live Campaign'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-actions"
          style={{
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total {campaigns.length} campaign(s) stored in Amazon S3
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              onClick={() => {
                onClose();
                onOpenCreateCampaign();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <UploadCloud size={14} />
              <span>Deploy New Campaign to S3</span>
            </button>
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
