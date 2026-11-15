import React, { useState, useRef } from 'react';
import { X, UploadCloud, AlertCircle, Image as ImageIcon, Film, Sparkles, Check } from 'lucide-react';
import { ApiService } from '../services/api';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignPublished: (campaignName: string, version: string) => void;
}

const PRESET_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  onClose,
  onCampaignPublished,
}) => {
  const [name, setName] = useState('Weekend Flash Sale Campaign');
  const [version, setVersion] = useState('2.0.0');
  const [headline, setHeadline] = useState('FLASH SALE: 50% OFF ALL FOOTWEAR & APPAREL!');
  const [themeColor, setThemeColor] = useState('#ef4444');
  const [description, setDescription] = useState('High-resolution retail promo media bundle staged for edge kiosk caching');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    sizeBytes: number;
    previewUrl: string;
    base64Data: string;
    mediaType: 'IMAGE' | 'VIDEO';
  } | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<'NONE' | 'SALE' | 'WELCOME'>('SALE');

  // Auto-suggest next version when modal opens
  React.useEffect(() => {
    if (isOpen) {
      ApiService.getCampaigns()
        .then((campaigns) => {
          if (campaigns && campaigns.length > 0) {
            const latestVer = (campaigns[0].version || '2.0.0').replace(/^v/i, '');
            const parts = latestVer.split('.').map(Number);
            if (parts.length === 3 && !parts.some(isNaN)) {
              setVersion(`${parts[0]}.${parts[1]}.${parts[2] + 1}`);
            } else {
              setVersion(`2.0.${campaigns.length + 1}`);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mediaType: 'IMAGE' | 'VIDEO' = file.type.startsWith('video') ? 'VIDEO' : 'IMAGE';
    const previewUrl = URL.createObjectURL(file);

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        sizeBytes: file.size,
        previewUrl,
        base64Data: reader.result as string,
        mediaType,
      });
      setSelectedPreset('NONE');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: 'SALE' | 'WELCOME') => {
    setSelectedPreset(preset);
    setSelectedFile(null);
    if (preset === 'SALE') {
      setName('Summer Flash Sale Campaign');
      setHeadline('FLASH SALE: UP TO 50% OFF IN STORE NOW!');
      setThemeColor('#ef4444');
    } else {
      setName('New Season Collection 2026');
      setHeadline('NEW SEASON COLLECTION - DISCOVER IN STORE');
      setThemeColor('#3b82f6');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let stagedAssets: Array<{
        filename: string;
        mediaType: 'IMAGE' | 'VIDEO' | 'HTML_BUNDLE';
        sizeBytes: number;
        url?: string;
      }> = [];

      // 1. If user uploaded a custom file, upload real binary bytes to S3
      if (selectedFile) {
        const uploadRes = await ApiService.uploadAsset({
          filename: selectedFile.name,
          fileData: selectedFile.base64Data,
          mediaType: selectedFile.mediaType,
        });

        stagedAssets.push({
          filename: uploadRes.filename,
          mediaType: uploadRes.mediaType,
          sizeBytes: uploadRes.sizeBytes,
          url: uploadRes.url,
        });
      } else if (selectedPreset === 'SALE') {
        const baseUrl = ApiService.getBaseUrl();
        stagedAssets.push({
          filename: 'flash_sale_poster.svg',
          mediaType: 'IMAGE',
          sizeBytes: 198000,
          url: `${baseUrl}/assets/flash_sale_poster.svg`,
        });
      } else {
        const baseUrl = ApiService.getBaseUrl();
        stagedAssets.push({
          filename: 'welcome_screen_ad.svg',
          mediaType: 'IMAGE',
          sizeBytes: 154000,
          url: `${baseUrl}/assets/welcome_screen_ad.svg`,
        });
      }

      await ApiService.createCampaign({
        name: name.trim(),
        version: version.trim(),
        headline: headline.trim(),
        themeColor,
        description: description.trim(),
        targetKiosks: ['ALL'],
        assets: stagedAssets,
      });

      onCampaignPublished(name, version);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to deploy campaign.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud size={20} color="#8b5cf6" />
            <h2 className="modal-title">Publish Campaign to Amazon S3</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Campaign Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Version</label>
              <input
                type="text"
                className="form-input"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 2.1.0"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Screen Headline Text</label>
            <input
              type="text"
              className="form-input"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              required
            />
          </div>

          {/* Real Multimedia Asset Upload Section */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Digital Media Asset (Image or Video)</span>
              <span style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem' }}>Direct S3 Storage Upload</span>
            </label>

            {/* Presets or Custom Upload toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div
                onClick={() => handleSelectPreset('SALE')}
                style={{
                  border: `2px solid ${selectedPreset === 'SALE' ? '#ef4444' : 'var(--border-subtle)'}`,
                  backgroundColor: selectedPreset === 'SALE' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.825rem',
                }}
              >
                <Sparkles size={16} color="#ef4444" />
                <div>
                  <div style={{ fontWeight: 600 }}>Flash Sale Poster</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>High-res Vector SVG (198 KB)</div>
                </div>
              </div>

              <div
                onClick={() => handleSelectPreset('WELCOME')}
                style={{
                  border: `2px solid ${selectedPreset === 'WELCOME' ? '#3b82f6' : 'var(--border-subtle)'}`,
                  backgroundColor: selectedPreset === 'WELCOME' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.825rem',
                }}
              >
                <Sparkles size={16} color="#3b82f6" />
                <div>
                  <div style={{ fontWeight: 600 }}>New Season Poster</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Retail Collection SVG (154 KB)</div>
                </div>
              </div>
            </div>

            {/* File Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${selectedFile ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                  {selectedFile.mediaType === 'IMAGE' ? (
                    <img
                      src={selectedFile.previewUrl}
                      alt="preview"
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  ) : (
                    <Film size={40} color="#8b5cf6" />
                  )}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                      {(selectedFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB • Ready for S3 upload
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <ImageIcon size={28} color="var(--text-secondary)" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    Click to Upload Custom Media from Computer
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    Supports PNG, JPG, WEBP, SVG or MP4 Video
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Theme Color */}
          <div className="form-group">
            <label className="form-label">Theme Accent Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {PRESET_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setThemeColor(c)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: c,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: themeColor === c ? '2px solid #ffffff' : 'none',
                    boxShadow: themeColor === c ? `0 0 10px ${c}` : 'none',
                  }}
                >
                  {themeColor === c && <Check size={16} color="#ffffff" />}
                </div>
              ))}
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                style={{
                  width: '34px',
                  height: '34px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-ghost btn-ghost-gold" disabled={loading} style={{ minWidth: '180px', fontWeight: 700 }}>
              {loading ? 'Uploading to S3...' : 'Upload & Deploy to S3'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
