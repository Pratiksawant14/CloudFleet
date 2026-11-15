import React, { useState } from 'react';
import { X, UploadCloud, AlertCircle } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await ApiService.createCampaign({
        name: name.trim(),
        version: version.trim(),
        headline: headline.trim(),
        themeColor,
        description: description.trim(),
        targetKiosks: ['ALL'],
        assets: [
          {
            filename: `${name.toLowerCase().replace(/\s+/g, '_')}_video_4k.mp4`,
            mediaType: 'VIDEO',
            sizeBytes: 18500000,
          },
          {
            filename: `${name.toLowerCase().replace(/\s+/g, '_')}_banner.png`,
            mediaType: 'IMAGE',
            sizeBytes: 3200000,
          },
        ],
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
      <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud size={20} color="#8b5cf6" />
            <h2 className="modal-title">Deploy New Campaign to S3</h2>
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

        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Staging this campaign to Amazon S3 creates an update manifest. Edge kiosks will detect the version increment on their next check-in, download the media assets to local storage, and switch screens automatically.
        </p>

        <form onSubmit={handleSubmit} className="command-form">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
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
              <label className="form-label">Version Tag</label>
              <input
                type="text"
                className="form-input"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 2.0.0"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Display Screen Headline</label>
            <input
              type="text"
              className="form-input"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Headline rendered on retail displays"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Display Theme Accent</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: themeColor === c ? '3px solid #ffffff' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setThemeColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Campaign Description</label>
            <textarea
              className="form-input"
              style={{ minHeight: '60px', resize: 'vertical' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
              disabled={loading}
            >
              <UploadCloud size={16} />
              <span>{loading ? 'Staging to S3...' : 'Publish to Cloud S3'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

