import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  HardDrive,
  Clock,
  CheckCircle2,
  UploadCloud,
  RefreshCw,
  Video,
  FileImage,
  Tv,
  ArrowRight,
  ShieldCheck,
  Sliders,
  Layers,
} from 'lucide-react';
import { CampaignManifest } from '../types';
import { ApiService } from '../services/api';

interface CampaignStudioProps {
  onOpenCreateCampaign: () => void;
  onCampaignActivated: (name: string, version: string) => void;
  onSwitchToOperations: () => void;
}

export const CampaignStudio: React.FC<CampaignStudioProps> = ({
  onOpenCreateCampaign,
  onCampaignActivated,
  onSwitchToOperations,
}) => {
  const [campaigns, setCampaigns] = useState<CampaignManifest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await ApiService.getCampaigns();
      setCampaigns(list);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch campaigns from Amazon S3.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const activeCampaign = campaigns.find((c) => c.status === 'PUBLISHED') || campaigns[0];

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

  const filteredCampaigns = campaigns.filter((c) => {
    if (selectedFilter === 'ACTIVE') return c.campaignId === activeCampaign?.campaignId;
    if (selectedFilter === 'ARCHIVED') return c.status === 'ARCHIVED';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Hero Showcase Header - Inspired by Luxury Mall Signage */}
      <div
        style={{
          position: 'relative',
          padding: '2.5rem 2rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 30, 0.95) 100%)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '400px',
            height: '100%',
            background: 'radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-gold)',
                  border: '1px solid var(--border-gold)',
                  padding: '3px 10px',
                  borderRadius: '20px',
                }}
              >
                Amazon S3 Content Storage
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Offline Edge Distribution
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                marginBottom: '0.4rem',
              }}
            >
              Campaign Studio & Edge Repository
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '720px' }}>
              Manage staged digital signage bundles on Amazon S3. Re-activate past campaigns with 1 click:
              edge kiosks check local disk cache and switch screens instantly with <strong>0 Cloud Egress Bandwidth</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn-ghost"
              onClick={fetchCampaigns}
              title="Refresh repository from S3"
              style={{ padding: '0.55rem 0.9rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Sync S3</span>
            </button>

            <button
              className="btn-ghost btn-ghost-cyan"
              onClick={() => window.open('/screen', '_blank')}
            >
              <Tv size={14} />
              <span>Full TV Display</span>
            </button>

            <button
              className="btn-ghost btn-ghost-gold"
              onClick={onOpenCreateCampaign}
              style={{ fontWeight: 700 }}
            >
              <UploadCloud size={15} />
              <span>Deploy New to S3</span>
            </button>
          </div>
        </div>

        {/* Circular Outline Stats Row (Directly Inspired by Reference in Image 2) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginTop: '2rem',
            paddingTop: '1.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="circle-outline-icon" style={{ borderColor: 'var(--border-gold)', color: 'var(--accent-gold)' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                {campaigns.length}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Campaigns Staged in S3
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="circle-outline-icon" style={{ borderColor: 'var(--border-cyan)', color: 'var(--accent-cyan)' }}>
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                100% Cache Hit
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                0 Bandwidth on Rollback
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="circle-outline-icon" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}>
              <HardDrive size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>
                ~15 ms
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Instant Local Screen Flip
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Live Campaign Hero */}
      {activeCampaign && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 10px #10b981',
                }}
              />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#ffffff' }}>
                Currently Broadcasting on Fleet
              </h2>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ID: {activeCampaign.campaignId}
            </span>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '14px',
              padding: '1.5rem',
              display: 'grid',
              gridTemplateColumns: '320px 1fr',
              gap: '2rem',
              boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.1)',
            }}
          >
            {/* Visual Thumbnail Preview */}
            <div
              style={{
                width: '100%',
                height: '210px',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#030712',
                border: '1px solid var(--border-subtle)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeCampaign.assets?.[0]?.url ? (
                activeCampaign.assets[0].mediaType === 'VIDEO' ? (
                  <video
                    src={activeCampaign.assets[0].url}
                    autoPlay
                    loop
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    src={activeCampaign.assets[0].url}
                    alt={activeCampaign.headline}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )
              ) : (
                <FileImage size={48} color="#64748b" />
              )}

              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  backgroundColor: 'rgba(0,0,0,0.75)',
                  backdropFilter: 'blur(6px)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#38bdf8',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                v{activeCampaign.version}
              </div>
            </div>

            {/* Campaign Information */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ShieldCheck size={12} />
                    Live Active
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Target: {activeCampaign.targetKiosks.join(', ')}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
                  {activeCampaign.headline}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  {activeCampaign.description || activeCampaign.name}
                </p>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>
                    <strong>File:</strong> {activeCampaign.assets?.[0]?.filename || 'promo_banner.png'}
                  </span>
                  <span>
                    <strong>Size:</strong> {((activeCampaign.assets?.[0]?.sizeBytes || 2400000) / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <span>
                    <strong>Published:</strong> {activeCampaign.publishedAt ? new Date(activeCampaign.publishedAt).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  className="btn-ghost btn-ghost-cyan"
                  onClick={() => window.open('/screen', '_blank')}
                >
                  <Tv size={14} />
                  <span>Preview on Edge TV Display</span>
                </button>

                <button
                  className="btn-ghost"
                  onClick={onSwitchToOperations}
                >
                  <span>View Fleet Status</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Repository Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
              All Staged Campaigns in Amazon S3
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Click any previous campaign to broadcast it instantly across the fleet. Edge kiosks bypass S3 re-download if cached.
            </p>
          </div>

          <div className="filter-group">
            {(['ALL', 'ACTIVE', 'ARCHIVED'] as const).map((filter) => (
              <button
                key={filter}
                className={`filter-btn ${selectedFilter === filter ? 'active' : ''}`}
                onClick={() => setSelectedFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredCampaigns.map((camp) => {
            const isLive = camp.campaignId === activeCampaign?.campaignId && camp.status === 'PUBLISHED';
            const isActivating = activatingId === camp.campaignId;
            const asset = camp.assets?.[0];
            const sizeMb = ((asset?.sizeBytes || 2400000) / (1024 * 1024)).toFixed(1);

            return (
              <div
                key={camp.campaignId}
                style={{
                  background: isLive ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card)',
                  backdropFilter: 'blur(12px)',
                  border: isLive ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s ease',
                  boxShadow: isLive ? '0 8px 24px -6px rgba(16, 185, 129, 0.15)' : '0 4px 16px rgba(0,0,0,0.2)',
                }}
              >
                {/* Media Preview Box */}
                <div
                  style={{
                    width: '100%',
                    height: '170px',
                    backgroundColor: '#030712',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {asset?.url ? (
                    asset.mediaType === 'VIDEO' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                        <Video size={32} color="#38bdf8" />
                        <span style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>VIDEO ASSET</span>
                      </div>
                    ) : (
                      <img
                        src={asset.url}
                        alt={camp.headline}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )
                  ) : (
                    <FileImage size={36} color="#64748b" />
                  )}

                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      backdropFilter: 'blur(6px)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#60a5fa',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    v{camp.version}
                  </div>

                  {isLive && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        backgroundColor: '#10b981',
                        color: '#000000',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Active Live
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        marginBottom: '0.4rem',
                        lineHeight: 1.3,
                      }}
                    >
                      {camp.name}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.825rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      "{camp.headline}"
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--border-subtle)',
                        marginBottom: '1rem',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <HardDrive size={12} />
                        {sizeMb} MB
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {camp.publishedAt ? new Date(camp.publishedAt).toLocaleDateString() : 'Draft'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {camp.campaignId.slice(0, 10)}...
                      </span>
                    </div>
                  </div>

                  {/* Actions (Ghost Buttons without solid background) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isLive ? (
                      <>
                        <div
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: '#34d399',
                            padding: '0.45rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          ✓ Broadcasting to Fleet
                        </div>
                        <button
                          className="btn-ghost"
                          onClick={() => handleDeactivate(camp)}
                          disabled={isActivating}
                          style={{ fontSize: '0.75rem', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                        >
                          Archive
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn-ghost btn-ghost-cyan"
                        onClick={() => handleActivate(camp)}
                        disabled={isActivating}
                        style={{ width: '100%', fontWeight: 700 }}
                      >
                        <Zap size={14} />
                        <span>{isActivating ? 'Activating...' : 'Set as Live Campaign (Instant Switch)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
