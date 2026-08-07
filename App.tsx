
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EquipmentView from './components/EquipmentView';
import SupportView from './components/SupportView';
import SparePartsView from './components/SparePartsView';
import SuppliesView from './components/SuppliesView';
import UserView from './components/UserView';
import Login from './components/Login';
import { ViewState, User } from './types';
import { DB } from './services/db';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(DB.getCurrentSession());
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.Dashboard);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    if (confirm('¿Está seguro de que desea cerrar la sesión?')) {
      DB.logout();
      setCurrentUser(null);
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case ViewState.Dashboard: return <Dashboard />;
      case ViewState.Equipos: return <EquipmentView />;
      case ViewState.Soporte: return <SupportView />;
      case ViewState.Repuestos: return <SparePartsView />;
      case ViewState.Insumos: return <SuppliesView />;
      case ViewState.Usuarios: return <UserView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f7f6]">
      <Sidebar currentView={currentView} setView={setCurrentView} onLogout={handleLogout} />
      
      <main className="flex-1 flex flex-col overflow-x-hidden">
        {/* The top header has been removed per request to maximize vertical space and rely on the sidebar */}
        <div className="p-8 lg:p-12 max-w-[1400px] w-full mx-auto flex flex-col gap-10">
          {renderView()}
        </div>

        <footer className="mt-auto border-t border-gray-100 py-8 bg-white text-center no-print">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            CRM TÉCNICO V2.5 Professional © 2024 - <span className="text-[#658C2A]">Eficiencia y Control</span>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default App;
