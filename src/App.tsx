import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';
import Header from './components/Header';
import Navigation from './components/Navigation';
import ProspectionForm from './components/ProspectionForm';
import OpportunitiesList from './components/OpportunitiesList';
import ActionsCommercialesForm from './components/ActionsCommercialesForm';
import ChantiersPage from './components/ChantiersPage';
import ValeurAViePage from './components/ValeurAViePage';
import { RelancesDevisPage } from './components/RelancesDevisPage';
import RelancesFacturesPage from './components/RelancesFacturesPage';
import DashboardClient from './components/DashboardClient';
import { Client } from './types';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('opportunities');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const handleClientCreated = (client: Client) => {
    setRefreshTrigger(prev => prev + 1);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'prospection':
        return <ProspectionForm onClientCreated={handleClientCreated} refreshTrigger={refreshTrigger} />;
      case 'opportunities':
        return <OpportunitiesList onNavigateToRelances={() => setActiveTab('relances-devis')} />;
      case 'relances-devis':
        return <RelancesDevisPage />;
      case 'relances-factures':
        return <RelancesFacturesPage />;
      case 'actions-commerciales':
        return <ActionsCommercialesForm refreshTrigger={refreshTrigger} />;
      case 'chantiers':
        return <ChantiersPage />;
      case 'valeur-a-vie':
        return <ValeurAViePage />;
      default:
        return <OpportunitiesList onNavigateToRelances={() => setActiveTab('relances-devis')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header />

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="py-8 overflow-x-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard-client/:extrabatId" element={<DashboardClientWrapper />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const DashboardClientWrapper: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Header />
      <DashboardClient />
    </>
  );
};

export default App;