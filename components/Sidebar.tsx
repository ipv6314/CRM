
import React from 'react';
import { ViewState, User } from '../types';
import { DB } from '../services/db';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout }) => {
  const currentUser = DB.getCurrentSession();
  
  const menuItems = [
    { id: ViewState.Dashboard, icon: 'dashboard', label: 'Dashboard' },
    { id: ViewState.Equipos, icon: 'computer', label: 'Equipos' },
    { id: ViewState.Soporte, icon: 'headset_mic', label: 'Soporte' },
    { id: ViewState.Repuestos, icon: 'inventory_2', label: 'Repuestos' },
    { id: ViewState.Usuarios, icon: 'group', label: 'Usuarios' },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col justify-between p-4 h-screen sticky top-0">
      <div className="flex flex-col gap-8">
        <div className="flex gap-3 items-center">
          <div className="bg-[#4B7349] rounded-lg p-2 text-white shadow-md">
            <span className="material-symbols-outlined text-2xl">analytics</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[#181411] text-base font-bold leading-tight uppercase">Admin CRM</h1>
            <p className="text-[#897161] text-xs font-normal">Technical Management</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                currentView === item.id
                  ? 'bg-[#4B7349]/10 text-[#4B7349] font-bold shadow-sm'
                  : 'text-[#181411] hover:bg-gray-100 font-medium'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <p className="text-sm">{item.label}</p>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        {onLogout && (
          <button 
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl h-11 px-4 border-2 border-red-50 text-red-500 text-sm font-bold hover:bg-red-50 transition-all uppercase tracking-tight"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        )}
        
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="size-10 rounded-full bg-[#3D3D3D] flex items-center justify-center text-white font-black text-xs border-2 border-white shadow-sm shrink-0">
            {currentUser?.username.substring(0,2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-black text-[#3D3D3D] truncate leading-tight">{currentUser?.name}</p>
            <p className="text-[10px] text-[#4B7349] font-bold uppercase tracking-tight truncate">{currentUser?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
