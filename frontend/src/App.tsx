import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FleetOverview } from './components/FleetOverview';
import { KioskTable } from './components/KioskTable';
import { KioskDetail } from './components/KioskDetail';
import { KioskScreenSimulator } from './components/KioskScreenSimulator';
import { PureKioskScreen } from './components/PureKioskScreen';
import { CampaignStudio } from './components/CampaignStudio';
import { CampaignModal } from './components/CampaignModal';
import { RegisterKioskModal } from './components/RegisterKioskModal';
import { SimulatorGuideModal } from './components/SimulatorGuideModal';
import { ApiService } from './services/api';
import { FleetSummary } from './types';
import { CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'OPERATIONS' | 'CAMPAIGNS' | 'SCREEN_SIMULATOR'>('OPERATIONS');
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
    }, 4500);
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
    showToast(`Campaign "${name}" (v${version}) deployed to Amazon S3! Edge fleet will auto-sync.`);
    fetchFleet();
  };

  const handleCampaignActivated = (name: string, version: string) => {
    showToast(`⚡ Campaign "${name}" (v${version}) is now LIVE! Edge kiosks with cached assets switch in ~15ms with 0 S3 download.`);
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

  const isScreenRoute =
    window.location.pathname === '/screen' ||
    window.location.pathname === '/display' ||
    new URLSearchParams(window.location.search).get('view') === 'screen';

  if (isScreenRoute) {
    return <PureKioskScreen />;
  }

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
        {activeView === 'CAMPAIGNS' ? (
          <CampaignStudio
            onOpenCreateCampaign={() => setIsCampaignOpen(true)}
            onCampaignActivated={handleCampaignActivated}
            onSwitchToOperations={() => setActiveView('OPERATIONS')}
          />
        ) : activeView === 'SCREEN_SIMULATOR' ? (
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
              onNavigateToCampaigns={() => setActiveView('CAMPAIGNS')}
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

      {/* Glassmorphic Modals with Fixed High Z-Index Overlays */}
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
