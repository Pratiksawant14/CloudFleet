import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FleetOverview } from './components/FleetOverview';
import { KioskTable } from './components/KioskTable';
import { KioskDetail } from './components/KioskDetail';
import { KioskScreenSimulator } from './components/KioskScreenSimulator';
import { CampaignModal } from './components/CampaignModal';
import { RegisterKioskModal } from './components/RegisterKioskModal';
import { SimulatorGuideModal } from './components/SimulatorGuideModal';
import { ApiService } from './services/api';
import { FleetSummary } from './types';
import { CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'OPERATIONS' | 'SCREEN_SIMULATOR'>('OPERATIONS');
  const [selectedKioskId, setSelectedKioskId] = useState<string | null>(null);
  const [simulatorKioskId, setSimulatorKioskId] = useState<string | undefined>(undefined);
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ONLINE' | 'SYNCING' | 'OFFLINE'>('ALL');

  // Modals
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((cur) => (cur === message ? null : cur));
    }, 4000);
  };

  const fetchFleet = async () => {
    try {
      const summary = await ApiService.getFleet();
      setFleetSummary(summary);
      setBackendConnected(true);
    } catch {
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleCampaignPublished = (name: string, version: string) => {
    showToast(`Campaign "${name}" (v${version}) published to Amazon S3! Kiosks will auto-sync.`);
    fetchFleet();
  };

  const handleKioskRegistered = (kioskId: string) => {
    showToast(`Kiosk ${kioskId} registered successfully.`);
    fetchFleet();
    setSelectedKioskId(kioskId);
  };

  const handleOpenScreenSimulator = (kioskId: string) => {
    setSimulatorKioskId(kioskId);
    setActiveView('SCREEN_SIMULATOR');
  };

  return (
    <div className="app-container">
      <Header
        backendConnected={backendConnected}
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          setSelectedKioskId(null);
        }}
        onRefresh={fetchFleet}
        onOpenCampaignModal={() => setIsCampaignOpen(true)}
        onOpenRegisterModal={() => setIsRegisterOpen(true)}
        onOpenSimulatorGuide={() => setIsGuideOpen(true)}
      />

      <main className="main-content">
        {activeView === 'SCREEN_SIMULATOR' ? (
          <KioskScreenSimulator
            initialKioskId={simulatorKioskId || fleetSummary?.kiosks[0]?.kioskId}
            onSwitchToOperations={() => setActiveView('OPERATIONS')}
          />
        ) : selectedKioskId ? (
          <KioskDetail
            kioskId={selectedKioskId}
            onBack={() => {
              setSelectedKioskId(null);
              fetchFleet();
            }}
            onShowToast={showToast}
          />
        ) : (
          <>
            <FleetOverview
              summary={fleetSummary}
              onFilterClick={(status) => setSelectedFilter(status)}
            />
            <KioskTable
              kiosks={fleetSummary?.kiosks || []}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
              onSelectKiosk={(id) => setSelectedKioskId(id)}
              onOpenScreenSimulator={handleOpenScreenSimulator}
            />
          </>
        )}
      </main>

      <CampaignModal
        isOpen={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
        onCampaignPublished={handleCampaignPublished}
      />

      <RegisterKioskModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onKioskRegistered={handleKioskRegistered}
      />

      <SimulatorGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {toastMessage && (
        <div className="toast-banner">
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
