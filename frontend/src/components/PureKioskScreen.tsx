import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { KioskState } from '../types';
import { ApiService } from '../services/api';

export const PureKioskScreen: React.FC = () => {
  const [kiosks, setKiosks] = useState<KioskState[]>([]);
  const [selectedKioskId, setSelectedKioskId] = useState<string>('');
  const [currentKiosk, setCurrentKiosk] = useState<KioskState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastVersion, setLastVersion] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<any>(null);

  // Parse query params (e.g. /screen?id=KIOSK-RETAIL-001)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get('id') || params.get('kiosk');
    if (paramId) {
      setSelectedKioskId(paramId);
    }
  }, []);

  // Poll Fleet & Active Kiosk
  const fetchKiosks = async () => {
    try {
      const summary = await ApiService.getFleet();
      setKiosks(summary.kiosks);
      if (!selectedKioskId && summary.kiosks.length > 0) {
        setSelectedKioskId(summary.kiosks[0].kioskId);
      }
    } catch {
      // Backend polling error
    }
  };

  useEffect(() => {
    fetchKiosks();
    const interval = setInterval(fetchKiosks, 2000);
    return () => clearInterval(interval);
  }, [selectedKioskId]);

  useEffect(() => {
    if (!selectedKioskId) return;
    const kiosk = kiosks.find((k) => k.kioskId === selectedKioskId) || null;
    if (kiosk) {
      if (lastVersion && kiosk.activeCampaign.version !== lastVersion) {
        setIsUpdating(true);
        setTimeout(() => setIsUpdating(false), 1800);
      }
      setLastVersion(kiosk.activeCampaign.version);
      setCurrentKiosk(kiosk);
    }
  }, [selectedKioskId, kiosks, lastVersion]);

  // Handle Fullscreen edge-to-edge
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current) {
        containerRef.current.requestFullscreen().catch(() => {
          document.documentElement.requestFullscreen().catch(() => {});
        });
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Show hover controls briefly on mouse move
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 2800);
  };

  const campaign = currentKiosk?.activeCampaign;
  const primaryAsset = campaign?.assets && campaign.assets.length > 0 ? campaign.assets[0] : null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onDoubleClick={toggleFullscreen}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        overflow: 'hidden',
        zIndex: 99999,
        cursor: showControls ? 'default' : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* S3 Update Transition Effect */}
      {isUpdating && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '4px solid #38bdf8',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '1.25rem',
            }}
          />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>
            UPDATING SCREEN BUFFER...
          </h2>
          <span style={{ color: '#38bdf8', fontSize: '0.9rem', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
            Campaign v{campaign?.version} Applied
          </span>
        </div>
      )}

      {/* Full-Bleed Media Display (Image or Video) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
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
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <img
              src={primaryAsset.url}
              alt={campaign?.headline}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: '#000000',
              }}
            />
          )
        ) : (
          /* High-Impact Digital Sign Billboard Fallback */
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `radial-gradient(circle at 60% 40%, ${campaign?.themeColor || '#1e1b4b'} 0%, #030712 80%)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '4rem',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.15,
                maxWidth: '1100px',
                textShadow: '0 4px 20px rgba(0,0,0,0.9)',
                marginBottom: '1.5rem',
              }}
            >
              {campaign?.headline || 'Welcome to Our Store'}
            </h1>
            <p
              style={{
                fontSize: 'clamp(1.1rem, 2.5vw, 1.8rem)',
                color: '#94a3b8',
                maxWidth: '750px',
                fontWeight: 500,
              }}
            >
              {campaign?.name}
            </p>
          </div>
        )}
      </div>

      {/* Elegant Bottom Dynamic Headline Banner (Subtle Overlay) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
          padding: '2.5rem 3rem 2rem 3rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 'clamp(1.4rem, 2.8vw, 2.2rem)',
              fontWeight: 800,
              color: '#ffffff',
              margin: 0,
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            }}
          >
            {campaign?.headline}
          </h2>
        </div>
      </div>

      {/* Floating Hover Controls (Only visible when mouse moves, completely invisible during presentation) */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.25s ease-in-out',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px',
          padding: '6px 12px',
        }}
      >
        {/* Kiosk Selector */}
        {kiosks.length > 1 && (
          <select
            value={selectedKioskId}
            onChange={(e) => setSelectedKioskId(e.target.value)}
            style={{
              backgroundColor: '#1f2937',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {kiosks.map((k) => (
              <option key={k.kioskId} value={k.kioskId}>
                {k.kioskId} ({k.location})
              </option>
            ))}
          </select>
        )}

        <button
          onClick={toggleFullscreen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Edge-to-edge Fullscreen (or double-click screen)"
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Edge-to-Edge TV'}</span>
        </button>

        <a
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#94a3b8',
            fontSize: '0.8rem',
            textDecoration: 'none',
            padding: '4px 8px',
          }}
        >
          <ExternalLink size={14} />
          <span>Ops Center</span>
        </a>
      </div>
    </div>
  );
};
