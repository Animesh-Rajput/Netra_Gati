import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import AlertModal from './components/AlertModal';

import Dashboard from './pages/Dashboard';
import TrajectorySearch from './pages/TrajectorySearch';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import OcrDemo from './pages/OcrDemo';

import { WebSocketProvider } from './context/WebSocketContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPlateForTrajectory, setSelectedPlateForTrajectory] = useState('CG04MB1001');

  // Cross-page navigation helper
  const navigateToPlateTrajectory = (plateNo) => {
    if (plateNo) {
      setSelectedPlateForTrajectory(plateNo);
      setActiveTab('trajectory');
    }
  };

  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-[#0B0F14] text-slate-100 flex flex-col md:flex-row antialiased">
        
        {/* Left Persistent Sidebar Navigation */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          
          {/* Top Status Bar */}
          <TopBar activeTab={activeTab} />

          {/* Dynamic Main Workspace Viewport */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#0B0F14]">
            <div className="max-w-[1600px] mx-auto">
              {activeTab === 'dashboard' && (
                <Dashboard onNavigateToPlate={navigateToPlateTrajectory} />
              )}
              {activeTab === 'trajectory' && (
                <TrajectorySearch initialPlate={selectedPlateForTrajectory} />
              )}
              {activeTab === 'analytics' && (
                <Analytics />
              )}
              {activeTab === 'alerts' && (
                <Alerts onNavigateToPlate={navigateToPlateTrajectory} />
              )}
              {activeTab === 'ocr-demo' && (
                <OcrDemo onNavigateToPlate={navigateToPlateTrajectory} />
              )}
            </div>
          </main>

          {/* Floating Alert Toast */}
          <AlertModal onNavigateToPlate={navigateToPlateTrajectory} />

        </div>

      </div>
    </WebSocketProvider>
  );
}
