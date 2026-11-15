import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Maximize2,
  Minimize2,
  HardDrive,
  RefreshCw,
  Sparkles,
  Cloud,
  Layers,
  ArrowRight,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { KioskState } from '../types';
import { ApiService } from '../services/api';

interface KioskScreenSimulatorProps {
  initialKioskId?: string;
  onSwitchToOperations: () => void;
}

export const KioskScreenSimulator: React.FC<KioskScreenSimulatorProps> = ({
  initialKioskId,
  onSwitchToOperations,
}) => {
  const [kiosks, setKiosks] = useState<KioskState[]>([]);
  const [selectedKioskId, setSelectedKioskId] = useState<string>(initialKioskId || '');
  const [currentKiosk, setCurrentKiosk] = useState<KioskState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showArchitectureHud, setShowArchitectureHud] = useState(true);
  const [isSyncingAnimation, setIsSyncingAnimation] = useState(false);
  const [lastVersionSeen, setLastVersionSeen] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll Fleet & Active Kiosk
  const fetchFleet = async () => {
    try {
      const summary = await ApiService.getFleet();
      setKiosks(summary.kiosks);
      if (!selectedKioskId && summary.kiosks.length > 0) {
        setSelectedKioskId(summary.kiosks[0].kioskId);
      }
    } catch (err) {
      console.error('Failed to poll fleet:', err);
    }
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedKioskId) return;
    const kiosk = kiosks.find((k) => k.kioskId === selectedKioskId) || null;
    if (kiosk) {
      if (lastVersionSeen && kiosk.activeCampaign.version !== lastVersionSeen) {
        // Trigger live S3 sync animation!
        setIsSyncingAnimation(true);
        setTimeout(() => setIsSyncingAnimation(false), 2400);
      }
      setLastVersionSeen(kiosk.activeCampaign.version);
      setCurrentKiosk(kiosk);
    }
  }, [selectedKioskId, kiosks]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const campaign = currentKiosk?.activeCampaign;
  const primaryAsset = campaign?.assets && campaign.assets.length > 0 ? campaign.assets[0] : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 100px)',
        gap: '1rem',
      }}
    >
      {/* Top Simulator Control Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '0.75rem 1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Monitor size={20} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Edge Kiosk Screen Hardware</span>
          </div>

          {/* Select Kiosk Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Screen:</span>
            <select
              value={selectedKioskId}
              onChange={(e) => setSelectedKioskId(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {kiosks.map((k) => (
                <option key={k.kioskId} value={k.kioskId}>
                  {k.kioskId} — {k.name} ({k.location})
                </option>
              ))}
            </select>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.25rem 0.65rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            OFFLINE-FIRST LOCAL PLAYBACK ACTIVE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn-secondary"
            onClick={() => setShowArchitectureHud(!showArchitectureHud)}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <Layers size={14} />
            {showArchitectureHud ? 'Hide Architecture HUD' : 'Show Architecture HUD'}
          </button>

          <button
            className="btn-secondary"
            onClick={toggleFullscreen}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen TV Mode'}
          </button>

          <button
            className="btn-primary"
            onClick={onSwitchToOperations}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
          >
            🏢 Fleet Ops Center
          </button>
        </div>
      </div>

      {/* Main Kiosk Physical Screen Simulator Canvas */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '520px',
          backgroundColor: '#030712',
          borderRadius: '16px',
          border: '8px solid #1f2937',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Physical Screen Bezel Brand Label */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '16px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            color: 'rgba(255, 255, 255, 0.6)',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span>{currentKiosk?.location || 'Store Entrance'}</span>
          <span>•</span>
          <span style={{ color: '#38bdf8' }}>{currentTime}</span>
        </div>

        {/* Syncing Overlay Animation (Triggered when update downloads from S3) */}
        {isSyncingAnimation && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 40,
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <RefreshCw size={54} color="#38bdf8" style={{ animation: 'spin 1.2s linear infinite', marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
              DOWNLOADING S3 UPDATE BUNDLE...
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '500px', textAlign: 'center' }}>
              Pulling newly published media assets from Amazon S3 into local disk cache. Switching edge display screen buffer.
            </p>
            <div
              style={{
                marginTop: '1.5rem',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                padding: '0.4rem 1rem',
                borderRadius: '20px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
              }}
            >
              Applying Version {campaign?.version}
            </div>
          </div>
        )}

        {/* Screen Content: Real Media Render */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {primaryAsset?.url ? (
            primaryAsset.mediaType === 'VIDEO' ? (
              <video
                src={primaryAsset.url}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <img
                src={primaryAsset.url}
                alt={campaign?.headline}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#0a0f1d',
                }}
              />
            )
          ) : (
            /* Fallback Graphic Billboard when no custom asset uploaded */
            <div
              style={{
                width: '100%',
                height: '100%',
                background: `radial-gradient(circle at 70% 30%, ${campaign?.themeColor || '#1e1b4b'} 0%, #030712 70%)`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '3rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '0.5rem 1rem',
                  borderRadius: '30px',
                  marginBottom: '1.5rem',
                  color: campaign?.themeColor || '#60a5fa',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  letterSpacing: '1px',
                }}
              >
                <Sparkles size={18} />
                <span>{campaign?.name || 'STORE DISPLAY CAMPAIGN'}</span>
              </div>

              <h1
                style={{
                  fontSize: '2.8rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  maxWidth: '900px',
                  lineHeight: 1.2,
                  textShadow: '0 4px 12px rgba(0,0,0,0.8)',
                  marginBottom: '1rem',
                }}
              >
                {campaign?.headline || 'Welcome to Our Store'}
              </h1>

              <p style={{ color: '#94a3b8', fontSize: '1.2rem', maxWidth: '650px' }}>
                {campaign?.description || 'Exclusive premium quality deals available in store today.'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Screen Ticker / Dynamic Promotion Banner */}
        <div
          style={{
            position: 'relative',
            zIndex: 20,
            marginTop: 'auto',
            background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 80%, transparent 100%)',
            padding: '1.5rem 2rem 1.25rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span
                style={{
                  backgroundColor: campaign?.themeColor || '#38bdf8',
                  color: '#000000',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                }}
              >
                LIVE DISPLAY v{campaign?.version}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
                {campaign?.name}
              </span>
            </div>

            <h2
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                textShadow: '0 2px 6px rgba(0,0,0,0.7)',
              }}
            >
              {campaign?.headline}
            </h2>
          </div>

          {/* Offline Edge Indicator */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              textAlign: 'right',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
              <ShieldCheck size={16} />
              <span>Offline Edge Storage</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Cached: {currentKiosk?.localCache.diskUsageMb || 24.5} MB | ID: {currentKiosk?.kioskId}
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Architecture & Live Serverless Flow HUD */}
      {showArchitectureHud && (
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--accent-purple)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Live Cloud Computing & Serverless Network Flow
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              How Edge Kiosk updates without keeping 24/7 servers running
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <HardDrive size={16} color="#10b981" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>1. Offline Local Playback</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Screen renders smoothly from local disk cache ({currentKiosk?.localCache.diskUsageMb || 24.5} MB). 0 Cloud network bandwidth used.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Cloud size={16} color="#38bdf8" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>2. Serverless Lambda Poll</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Kiosk periodically sends lightweight HTTP POST to API Gateway. Lambda wakes for 40ms, checks S3 for updates, then shuts down.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Layers size={16} color="#8b5cf6" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>3. Direct S3 Asset Pull</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                When campaign version changes, kiosk downloads binary image/video directly from S3 bucket into local edge storage.
              </p>
            </div>

            {/* Step 4 */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Monitor size={16} color="#f59e0b" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>4. Screen Buffer Switch</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Kiosk verifies checksum, updates its screen locally, and posts an acknowledgement back to CloudFleet audit log.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
