import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FleetOverview } from './components/FleetOverview';
import { DeviceTable } from './components/DeviceTable';
import { DeviceDetail } from './components/DeviceDetail';
import { AlertsList } from './components/AlertsList';
import { RegisterDeviceModal } from './components/RegisterDeviceModal';
import { SimulatorGuideModal } from './components/SimulatorGuideModal';
import { ApiService } from './services/api';
import { FleetSummary } from './types';
import { CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fleet' | 'alerts'>('fleet');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ONLINE' | 'WARNING' | 'OFFLINE'>('ALL');

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Toast notifications
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
    } catch (err: unknown) {
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDeviceRegistered = (deviceId: string) => {
    showToast(`Device ${deviceId} registered successfully.`);
    fetchFleet();
    setSelectedDeviceId(deviceId);
  };

  return (
    <div className="app-container">
      <Header
        backendConnected={backendConnected}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedDeviceId(null);
        }}
        onRefresh={fetchFleet}
        onOpenRegisterModal={() => setIsRegisterOpen(true)}
        onOpenSimulatorGuide={() => setIsGuideOpen(true)}
        activeAlertCount={fleetSummary?.activeAlerts || 0}
      />

      <main className="main-content">
        {selectedDeviceId ? (
          <DeviceDetail
            deviceId={selectedDeviceId}
            onBack={() => {
              setSelectedDeviceId(null);
              fetchFleet();
            }}
            onShowToast={showToast}
          />
        ) : activeTab === 'alerts' ? (
          <AlertsList
            onShowToast={showToast}
            onSelectDevice={(deviceId) => {
              setSelectedDeviceId(deviceId);
              setActiveTab('fleet');
            }}
          />
        ) : (
          <>
            <FleetOverview
              summary={fleetSummary}
              onFilterClick={(status) => setSelectedFilter(status)}
            />
            <DeviceTable
              devices={fleetSummary?.devices || []}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
              onSelectDevice={(deviceId) => setSelectedDeviceId(deviceId)}
            />
          </>
        )}
      </main>

      <RegisterDeviceModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onDeviceRegistered={handleDeviceRegistered}
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
