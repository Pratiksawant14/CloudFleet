import React from 'react';
import { X, Terminal, Play, Zap, Flame, BatteryLow, PowerOff } from 'lucide-react';

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
            <h2 className="modal-title">Software IoT Device Simulator Guide</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          CloudFleet utilizes a software device simulator that transmits realistic telemetry and polls for administrative commands over HTTP. Run the simulator locally from your terminal:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <Play size={14} color="#10b981" />
              <span>1. Run Automated End-to-End Demo Script (All 18 Steps)</span>
            </div>
            <div className="code-box">npm run simulate:demo</div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <Zap size={14} color="#38bdf8" />
              <span>2. Start Multi-Device Fleet Simulator (3 Devices)</span>
            </div>
            <div className="code-box">npm run dev:simulator</div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <Flame size={14} color="#f59e0b" />
              <span>3. Inject Thermal Overheat Hazard (Trigger WARNING Alert)</span>
            </div>
            <div className="code-box">npm run dev:simulator -- --overheat CF-DEVICE-001</div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <BatteryLow size={14} color="#ef4444" />
              <span>4. Inject Low Battery Hazard (&lt; 20% Battery Alert)</span>
            </div>
            <div className="code-box">npm run dev:simulator -- --low-battery CF-DEVICE-001</div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <PowerOff size={14} color="#6b7280" />
              <span>5. Simulate Network Disconnect / Hardware Crash</span>
            </div>
            <div className="code-box">npm run dev:simulator -- --disconnect CF-DEVICE-001</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
