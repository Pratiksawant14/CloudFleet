import React from 'react';
import { X, Terminal, Play, Monitor, RefreshCw } from 'lucide-react';

interface SimulatorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimulatorGuideModal: React.FC<SimulatorGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={20} color="#38bdf8" />
            <h2 className="modal-title">Edge Kiosk Simulator Guide</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Simulates retail kiosks running 24/7 in offline mode. They only contact the serverless AWS Lambda backend when checking for new S3 campaign updates:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <Play size={14} color="#10b981" />
              <span>1. Run Automated End-to-End Update Demo Script</span>
            </div>
            <div className="code-box">npm run simulate:demo</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Runs the full lifecycle: registers kiosk $\rightarrow$ local playback $\rightarrow$ publishes v2.0 to S3 $\rightarrow$ kiosk downloads assets $\rightarrow$ switches screen.
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <Monitor size={14} color="#38bdf8" />
              <span>2. Start Multi-Kiosk Fleet (Downtown, Mall, Airport)</span>
            </div>
            <div className="code-box">npm run dev:simulator</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Starts 3 active simulated kiosks playing locally and checking for S3 updates.
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <RefreshCw size={14} color="#8b5cf6" />
              <span>3. Deploy Campaign from Dashboard</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Click <strong>"Deploy Campaign to S3"</strong> in the top header. Fill in a new version (e.g. <code>2.0.0</code>) and watch the kiosks automatically download the assets and update their screen displays in real time!
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn-ghost btn-ghost-cyan" onClick={onClose} style={{ fontWeight: 600 }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
