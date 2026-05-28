
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DB } from '../services/db';
import { Equipment, SupportTicket, SparePart } from '../types';
import { COLORS, INCIDENT_TYPES } from '../constants';
import { GoogleGenAI } from "@google/genai";

const SupportView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [globalTickets, setGlobalTickets] = useState<SupportTicket[]>(DB.getTickets());
  const [printingDictamen, setPrintingDictamen] = useState<SupportTicket | null>(null);
  const [viewingTicket, setViewingTicket] = useState<SupportTicket | null>(null);
  
  const equipment = DB.getEquipment();
  const spareParts = DB.getSpareParts();
  const users = DB.getUsers();
  
  const currentUser = DB.getCurrentSession();
  const isAdmin = currentUser?.role === 'admin';

  const filteredEquipment = useMemo(() => {
    if (!searchTerm) return [];
    return equipment.filter(e => 
      (e.inventoryId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.macLan || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, equipment]);

  const displayHistory = useMemo(() => {
    const all = [...globalTickets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (selectedEquip) {
      return all.filter(t => t.equipmentId === selectedEquip.id);
    }
    return all.slice(0, 50);
  }, [globalTickets, selectedEquip]);

  const handleCreateTicket = (ticket: Partial<SupportTicket>, updatedSpecs?: Partial<Equipment>) => {
    if (!selectedEquip) return;

    if (updatedSpecs) {
      const newEquipData = { 
        ...selectedEquip, 
        ...updatedSpecs, 
        updatedAt: new Date().toISOString().split('T')[0] 
      };
      DB.saveEquipment(newEquipData);
      setSelectedEquip(newEquipData);
    }

    const newTicket: SupportTicket = {
      id: Math.random().toString(36).substr(2, 9),
      equipmentId: selectedEquip.id,
      date: new Date().toLocaleDateString('es-AR'),
      technician: DB.getCurrentSession()?.name || 'Usuario',
      type: (ticket.type as any) || 'Hardware',
      description: ticket.description || '',
      affectedParts: ticket.affectedParts || [],
      dictamen: ticket.dictamen
    };

    DB.saveTicket(newTicket);
    setShowNewTicket(false);
    setGlobalTickets(DB.getTickets());
    
    const refreshed = DB.getEquipment().find(e => e.id === selectedEquip.id);
    setSelectedEquip(refreshed || null);

    if (newTicket.type === 'Baja' && newTicket.dictamen) {
      if (confirm('Baja procesada con éxito. ¿Desea abrir la vista de impresión del Dictamen Técnico?')) {
        handlePrintDictamen(newTicket);
      }
    }
  };

  const handlePrintDictamen = (ticket: SupportTicket) => {
    setPrintingDictamen(ticket);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleClearHistory = () => {
    if (!isAdmin) return;
    if (confirm('¿Está seguro de que desea limpiar TODO el historial de soporte? Esta acción no se puede deshacer.')) {
      DB.clearTickets();
      setGlobalTickets([]);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in slide-in-from-right-4 duration-500 pb-20">
       <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black text-[#181411] uppercase tracking-tight">Soporte Técnico</h2>
        <p className="text-[#897161]">Supervisión constante y gestión de incidencias</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase text-gray-400 ml-1">Buscar Equipo para Soporte</label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 group-focus-within:text-[#4B7349]">search</span>
            <input 
              type="text" 
              placeholder="Inventario, Nombre, Serie o MAC..." 
              className="w-full h-12 pl-10 pr-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#4B7349]/50 text-sm font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {searchTerm && filteredEquipment.length > 0 && (
          <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto shadow-inner bg-gray-50/30">
            {filteredEquipment.map(e => (
              <button 
                key={e.id}
                onClick={() => { setSelectedEquip(e); setSearchTerm(''); }}
                className="w-full p-4 flex justify-between items-center hover:bg-green-50 text-left border-b last:border-0 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="size-10 bg-white rounded-lg border flex items-center justify-center text-[#4B7349]">
                    <span className="material-symbols-outlined">computer</span>
                  </div>
                  <div>
                    <p className="font-black text-[#3D3D3D]">{e.inventoryId || 'SIN INVENTARIO'}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{e.name} — SN: {e.serialNumber || 'N/A'}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#4B7349]">add_circle</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEquip && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <div className={`p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-8 relative overflow-hidden group transition-all ${selectedEquip.isDecommissioned ? 'bg-red-900' : 'bg-[#3D3D3D]'} text-white`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[180px]">branding_watermark</span>
            </div>

            <div className="flex-1 flex flex-col gap-6 relative z-10">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedEquip.isDecommissioned ? 'bg-black' : 'bg-[#4B7349]'}`}>
                    {selectedEquip.isDecommissioned ? 'Equipo de Baja' : 'Equipo Seleccionado'}
                  </div>
                  <span className="text-gray-400 text-xs font-bold">{selectedEquip.effector}</span>
                </div>
                <button 
                  onClick={() => setSelectedEquip(null)} 
                  className="size-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className={`text-4xl font-black tracking-tighter ${selectedEquip.isDecommissioned ? 'text-white' : 'text-[#4B7349]'}`}>{selectedEquip.inventoryId || 'SIN INV.'}</h3>
                <p className="text-xl font-bold opacity-80">{selectedEquip.name} • S/N: {selectedEquip.serialNumber || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-4 border-y border-white/10">
                <SpecItem label="Procesador" value={selectedEquip.cpu} sub={selectedEquip.speed} icon="memory" />
                <SpecItem label="Memoria RAM" value={selectedEquip.ramCapacity} icon="rebase" />
                <SpecItem label="Almacenamiento" value={selectedEquip.storageCapacity} sub={selectedEquip.storageType} icon="database" />
                <SpecItem label="Ubicación" value={selectedEquip.service} sub={`${selectedEquip.area}`} icon="location_on" />
              </div>

              <div className="flex items-center gap-4">
                {!selectedEquip.isDecommissioned ? (
                  <button 
                    onClick={() => setShowNewTicket(true)}
                    className="h-12 px-8 bg-[#4B7349] text-white rounded-xl font-black hover:bg-[#457330] transition-all uppercase text-xs shadow-xl shadow-green-950/40 flex items-center gap-2 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-lg">add_task</span>
                    Registrar Nueva Incidencia
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-red-300 font-bold uppercase text-xs">
                    <span className="material-symbols-outlined">block</span>
                    Equipo retirado de servicio
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{selectedEquip.isDecommissioned ? 'Fecha de Baja' : 'Última Actualización'}</span>
                  <span className="text-xs font-bold text-white/60">{selectedEquip.updatedAt || selectedEquip.createdAt}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#3D3D3D]">history</span>
            <h3 className="text-xl font-black text-[#3D3D3D] uppercase tracking-tight">
              {selectedEquip ? `Historial de ${selectedEquip.inventoryId || 'Equipo'}` : 'Soportes Recientes (Global)'}
            </h3>
          </div>
          {isAdmin && !selectedEquip && globalTickets.length > 0 && (
            <button 
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-4 h-9 rounded-lg border-2 border-red-50 text-red-500 text-[10px] font-black uppercase hover:bg-red-50 transition-all"
            >
              <span className="material-symbols-outlined text-base">delete_sweep</span>
              Limpiar Historial
            </button>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] border-b">
                <tr>
                  <th className="px-6 py-4">Fecha / Técnico</th>
                  {!selectedEquip && <th className="px-6 py-4">Equipo</th>}
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Descripción / Actuación</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayHistory.length === 0 ? (
                  <tr>
                    <td colSpan={selectedEquip ? 4 : 5} className="px-6 py-20 text-center">
                       <p className="text-xs font-black uppercase opacity-20">Sin registros</p>
                    </td>
                  </tr>
                ) : (
                  displayHistory.map(ticket => {
                    const equip = equipment.find(e => e.id === ticket.equipmentId);
                    return (
                      <tr key={ticket.id} className="hover:bg-green-50/20 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="font-black text-[#4B7349] text-xs">{ticket.date}</span>
                            <span className="text-[11px] font-bold text-gray-500 uppercase">{ticket.technician}</span>
                          </div>
                        </td>
                        {!selectedEquip && (
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#3D3D3D]">{equip?.inventoryId || 'N/A'}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{equip?.name || 'Desconocido'}</span>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                            ticket.type === 'Hardware' ? 'bg-red-50 text-red-600 border-red-100' :
                            ticket.type === 'Software' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            ticket.type === 'Baja' ? 'bg-black text-white border-black' :
                            'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {ticket.type}
                          </span>
                        </td>
                        <td className="px-6 py-5 max-w-md">
                          <p className="text-sm text-gray-600 line-clamp-2 leading-snug italic">"{ticket.description}"</p>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex gap-2 justify-end items-center">
                            <button
                              onClick={() => setViewingTicket(ticket)}
                              className="text-[#4B7349] hover:bg-green-50/50 p-2 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase transition-all"
                              title="Ver Detalle Soporte"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              Detalle
                            </button>
                            {ticket.type === 'Baja' && ticket.dictamen && (
                              <button 
                                onClick={() => handlePrintDictamen(ticket)}
                                className="text-red-600 hover:bg-red-50 p-2 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase transition-all"
                                title="Imprimir Dictamen"
                              >
                                <span className="material-symbols-outlined text-sm">print</span>
                                Dictamen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showNewTicket && selectedEquip && (
        <NewTicketModal 
          onClose={() => setShowNewTicket(false)} 
          onSubmit={handleCreateTicket} 
          parts={spareParts}
          equipment={selectedEquip}
        />
      )}

      {viewingTicket && (
        <TicketDetailsModal 
          ticket={viewingTicket} 
          onClose={() => setViewingTicket(null)} 
          equipmentList={equipment} 
          partsList={spareParts}
          onPrintDictamen={handlePrintDictamen}
        />
      )}

      {printingDictamen && (
        <div id="print-section" className="hidden bg-white p-8 text-black font-sans min-h-[1050px] flex-col items-center">
          {(() => {
            const equip = equipment.find(e => e.id === printingDictamen.equipmentId);
            const technicianUser = users.find(u => u.name === printingDictamen.technician);
            const techLegajo = technicianUser?.legajo || '—';
            
            return (
              <div className="w-full max-w-[750px] flex flex-col items-center relative">
                <div className="w-full flex justify-end mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold">FECHA |</span>
                    <span className="text-xs font-semibold border-b border-black min-w-[150px] text-center pb-0.5">
                      {printingDictamen.date}
                    </span>
                  </div>
                </div>
                <h1 className="text-sm font-bold mb-6 text-center w-full uppercase">
                  DICTAMEN TÉCNICO DE BAJA EQUIPOS INFORMÁTICOS
                </h1>
                <div className="w-full border-t border-black mb-1">
                  <PrintRow label="SOLICITANTE" value={printingDictamen.dictamen?.solicitante} gray />
                  <PrintRow label="LEGAJO" value={printingDictamen.dictamen?.legajo} />
                  <PrintRow label="EFECTOR" value={equip?.effector} gray />
                  <PrintRow label="AREA / SERVICIO" value={`${equip?.area} / ${equip?.service}`} />
                </div>
                <div className="w-full border-t border-black mb-6">
                  <PrintRow label="N° DE INVENTARIO" value={equip?.inventoryId} gray />
                  <PrintRow label="TIPO DE EQUIPO" value={equip?.type} />
                  <PrintRow label="MARCA" value={equip?.brand} gray />
                  <PrintRow label="MODELO" value={equip?.model} />
                  <PrintRow label="N° DE SERIE" value={equip?.serialNumber || 'N/A'} gray />
                  <PrintRow label="MOTIVO DE BAJA" value={printingDictamen.description} height="min-h-[60px]" />
                </div>
                <div className="w-full mb-8">
                   <div className="w-full h-[320px] flex flex-col relative overflow-hidden">
                      <div className="absolute top-2 left-0 right-0 text-center pointer-events-none">
                        <span className="text-[9px] font-bold uppercase opacity-20 tracking-widest">AREA PARA INSERTAR IMAGENES</span>
                      </div>
                      <div className="w-full h-full flex items-center justify-center p-4">
                        {printingDictamen.dictamen?.image ? (
                          <img src={printingDictamen.dictamen.image} className="max-h-full max-w-full object-contain" alt="Imagen Adjunta" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 opacity-5">
                             <span className="material-symbols-outlined text-6xl">image_not_supported</span>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
                <p className="text-[11px] text-center font-medium leading-relaxed max-w-[650px] mb-12 italic">
                  Tras <span className="font-bold">revisión y diagnóstico</span> del bien previamente detallado, se concluye que dicho equipo puede ser debidamente dado de baja del <span className="font-bold">inventario</span> que corresponda.
                </p>
                <div className="w-full grid grid-cols-2 border-t border-black mt-auto">
                   <div className="p-4 flex items-center justify-center text-center">
                      <span className="text-[9px] font-black uppercase leading-tight tracking-tight">
                        TÉCNICO/CA SUPERVISOR/RA DEL<br/>DICTAMEN TÉCNICO
                      </span>
                   </div>
                   <div className="bg-gray-50 flex flex-col items-center justify-center py-6 border-l border-black">
                      <span className="text-[11px] font-black text-[#3D3D3D] uppercase border-b border-black/20 pb-0.5 mb-1 px-4">
                        {printingDictamen.technician}
                      </span>
                      <span className="text-[10px] font-black text-gray-500">
                        L.P. {techLegajo}
                      </span>
                   </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

const PrintRow = ({ label, value, gray, height = "min-h-[35px]" }: any) => (
  <div className={`w-full flex border-b border-black items-stretch ${height}`}>
    <div className="w-[40%] p-2 flex items-center justify-end border-r border-black pr-4">
      <span className="text-[9px] font-black uppercase tracking-tight text-right leading-none">{label}</span>
    </div>
    <div className={`w-[60%] p-2 flex items-center pl-4 ${gray ? 'bg-gray-100' : ''}`}>
      <span className="text-[10px] font-bold uppercase">{value || '—'}</span>
    </div>
  </div>
);

const SpecItem = ({ icon, label, value, sub }: any) => (
  <div className="flex gap-3 items-center">
    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-[#4B7349]">
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-black uppercase text-gray-400 leading-tight">{label}</span>
      <span className="text-sm font-bold text-white truncate max-w-[120px]">{value || 'N/A'}</span>
      {sub && <span className="text-[9px] font-bold text-[#4B7349] uppercase">{sub}</span>}
    </div>
  </div>
);

const NewTicketModal = ({ onClose, onSubmit, parts, equipment }: { onClose: () => void, onSubmit: (t: any, s?: any) => void, parts: SparePart[], equipment: Equipment }) => {
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Hardware');
  const [affectedParts, setAffectedParts] = useState<{partId: string, quantity: number, serial?: string}[]>([]);
  const [isBaja, setIsBaja] = useState(false);
  const [showDictamenPopup, setShowDictamenPopup] = useState(false);
  const [dictamenData, setDictamenData] = useState({ solicitante: '', legajo: '', image: '' });
  
  // Estado para especificaciones editables (Información Básica del Equipo)
  const [editableSpecs, setEditableSpecs] = useState({
    cpu: equipment.cpu,
    speed: equipment.speed,
    ramCapacity: equipment.ramCapacity,
    storageCapacity: equipment.storageCapacity,
    storageType: equipment.storageType,
    os: equipment.os
  });

  const isFormValid = description.trim().length > 0 && (!isBaja || (dictamenData.solicitante && dictamenData.legajo));

  // Alerta si hay repuestos vinculados pero no se han modificado las specs
  const partsLinked = affectedParts.length > 0;
  const specsModified = JSON.stringify(editableSpecs) !== JSON.stringify({
    cpu: equipment.cpu,
    speed: equipment.speed,
    ramCapacity: equipment.ramCapacity,
    storageCapacity: equipment.storageCapacity,
    storageType: equipment.storageType,
    os: equipment.os
  });

  const addPart = (id: string) => {
    if (id === "") return;
    const part = parts.find((p: any) => p.id === id);
    if (!part) return;
    if (part.isSerialized) {
      setAffectedParts([...affectedParts, { partId: id, quantity: 1, serial: '' }]);
    } else {
      const existing = affectedParts.find(p => p.partId === id);
      if (existing) {
        setAffectedParts(affectedParts.map(p => p.partId === id ? {...p, quantity: p.quantity + 1} : p));
      } else {
        setAffectedParts([...affectedParts, { partId: id, quantity: 1 }]);
      }
    }
  };

  const updatePartSerial = (index: number, serial: string) => {
    const newParts = [...affectedParts];
    newParts[index] = { ...newParts[index], serial };
    setAffectedParts(newParts);
  };

  const removeAffectedPart = (index: number) => {
    setAffectedParts(affectedParts.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDictamenData({ ...dictamenData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const finalType = isBaja ? 'Baja' : type;
    const payload: Partial<SupportTicket> = { type: finalType as any, description, affectedParts, dictamen: isBaja ? dictamenData : undefined };
    
    // Se envía la actualización de equipo si las specs cambiaron
    onSubmit(payload, specsModified ? editableSpecs : undefined);
  };

  return (
    <div className="fixed inset-0 bg-[#181411]/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className={`p-8 text-white flex justify-between items-center transition-colors ${isBaja ? 'bg-red-600' : 'bg-[#4B7349]'}`}>
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center"><span className="material-symbols-outlined text-3xl">{isBaja ? 'report' : 'construction'}</span></div>
            <div className="flex flex-col">
              <h3 className="text-xl font-black uppercase tracking-tighter">{isBaja ? 'Baja de Equipo' : 'Registro de Trabajo'}</h3>
              <p className="text-white/70 text-xs font-bold uppercase">{equipment.inventoryId || 'SIN INV.'}</p>
            </div>
          </div>
          <button onClick={onClose} className="size-10 rounded-full hover:bg-white/10 transition-all flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-8 flex flex-col gap-8 max-h-[80vh] overflow-y-auto no-scrollbar">
          
          <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase text-red-600">Baja definitiva del activo</span>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-tight">Requiere Dictamen Técnico Oficial</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isBaja} onChange={() => { setIsBaja(!isBaja); if(!isBaja) setShowDictamenPopup(true); }} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          {!isBaja && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-black uppercase text-gray-400 ml-1">Tipo de Tarea</label>
              <div className="flex flex-wrap gap-2">
                {INCIDENT_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setType(t)} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all border-2 uppercase tracking-widest ${type === t ? 'bg-[#3D3D3D] border-[#3D3D3D] text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-green-200'}`}>{t}</button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Informe Técnico / Motivo</label>
            <textarea className="w-full rounded-2xl border-gray-200 focus:ring-2 focus:ring-[#4B7349] focus:border-transparent p-5 text-sm min-h-[100px] bg-gray-50 transition-all font-medium placeholder:text-gray-300" placeholder={isBaja ? "Escriba el motivo técnico detallado para el dictamen..." : "Describa detalladamente la actuación técnica..."} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {!isBaja && (
            <>
              {/* Sección de Repuestos */}
              <div className="flex flex-col gap-5 p-6 bg-gray-50 rounded-3xl border border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <label className="text-xs font-black uppercase text-gray-500">Repuestos Utilizados</label>
                    <span className="text-[9px] font-bold text-[#4B7349] uppercase">Se restarán automáticamente del stock</span>
                  </div>
                  <select className="text-xs font-black rounded-xl border-gray-200 bg-white focus:ring-2 focus:ring-[#4B7349] py-2 px-4 shadow-sm" onChange={(e) => addPart(e.target.value)} value=""><option value="">+ Vincular Repuesto</option>{parts.filter((p:any) => p.currentStock > 0).map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select>
                </div>
                {affectedParts.length > 0 && (
                  <div className="grid grid-cols-1 gap-3">
                    {affectedParts.map((ap, index) => { 
                      const part = parts.find((p: any) => p.id === ap.partId); 
                      return (
                        <div key={index} className="bg-white border border-gray-100 flex items-center justify-between p-4 rounded-2xl shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-[#3D3D3D] uppercase">{part?.name}</span>
                            {part?.isSerialized && (
                              <select className="mt-1 text-[10px] font-mono font-bold bg-green-50 border-none rounded-lg h-7 py-0" value={ap.serial} onChange={(e) => updatePartSerial(index, e.target.value)} required>
                                <option value="">-- SELECCIONAR SN --</option>
                                {part.serials?.map((sn: string) => (<option key={sn} value={sn}>{sn}</option>))}
                              </select>
                            )}
                          </div>
                          <button onClick={() => removeAffectedPart(index)} className="material-symbols-outlined text-gray-300 hover:text-red-500">delete</button>
                        </div>
                      ); 
                    })}
                  </div>
                )}
              </div>

              {/* Sección de Actualización de Ficha (Información Básica) */}
              <div className={`flex flex-col gap-4 p-6 border-2 border-dashed rounded-3xl transition-all ${partsLinked && !specsModified ? 'bg-orange-50 border-orange-200 animate-pulse' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined ${partsLinked && !specsModified ? 'text-orange-500' : 'text-[#4B7349]'}`}>
                      {partsLinked && !specsModified ? 'warning' : 'edit_note'}
                    </span>
                    <label className="text-xs font-black uppercase text-gray-500">
                      Actualizar Ficha Técnica (Básico)
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase">CPU</span>
                    <input type="text" className="h-9 px-3 text-xs rounded-lg border-gray-200 bg-gray-50 font-bold focus:ring-[#4B7349]" value={editableSpecs.cpu} onChange={e => setEditableSpecs({...editableSpecs, cpu: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Memoria RAM</span>
                    <input type="text" className="h-9 px-3 text-xs rounded-lg border-gray-200 bg-gray-50 font-bold focus:ring-[#4B7349]" value={editableSpecs.ramCapacity} onChange={e => setEditableSpecs({...editableSpecs, ramCapacity: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Almacenamiento</span>
                    <input type="text" className="h-9 px-3 text-xs rounded-lg border-gray-200 bg-gray-50 font-bold focus:ring-[#4B7349]" value={editableSpecs.storageCapacity} onChange={e => setEditableSpecs({...editableSpecs, storageCapacity: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Sistema Operativo</span>
                    <input type="text" className="h-9 px-3 text-xs rounded-lg border-gray-200 bg-gray-50 font-bold focus:ring-[#4B7349]" value={editableSpecs.os} onChange={e => setEditableSpecs({...editableSpecs, os: e.target.value})} />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <button type="button" disabled={!isFormValid} onClick={handleSubmit} className={`h-16 shrink-0 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98] ${isFormValid ? (isBaja ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3D3D3D] text-white hover:bg-black') : 'bg-gray-100 text-gray-300 cursor-not-allowed'} text-white`}>
              {isBaja ? 'Procesar Baja Definitiva' : 'Guardar y Sincronizar'}
            </button>
          </div>
        </div>
      </div>

      {showDictamenPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 bg-red-600 text-white flex justify-between items-center"><h3 className="font-black uppercase tracking-widest text-sm">Dictamen Técnico de Baja</h3><button onClick={() => setShowDictamenPopup(false)} className="material-symbols-outlined">close</button></div>
             <div className="p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-1"><label className="text-[10px] font-black text-gray-400 uppercase">SOLICITANTE</label><input className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-red-600 font-bold text-sm" placeholder="Nombre del responsable solicitante" value={dictamenData.solicitante} onChange={e => setDictamenData({...dictamenData, solicitante: e.target.value})} /></div>
                <div className="flex flex-col gap-1"><label className="text-[10px] font-black text-gray-400 uppercase">LEGAJO</label><input className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-red-600 font-mono font-bold text-sm" placeholder="Número de legajo personal" value={dictamenData.legajo} onChange={e => setDictamenData({...dictamenData, legajo: e.target.value})} /></div>
                <div className="flex flex-col gap-1"><label className="text-[10px] font-black text-gray-400 uppercase">IMAGEN ADJUNTA (OPCIONAL)</label><input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />{dictamenData.image && (<div className="mt-2 h-20 w-full rounded-lg border border-dashed border-red-200 overflow-hidden bg-gray-50"><img src={dictamenData.image} className="h-full w-full object-contain" alt="Preview" /></div>)}</div>
                <button onClick={() => setShowDictamenPopup(false)} disabled={!dictamenData.solicitante || !dictamenData.legajo} className={`h-14 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${(dictamenData.solicitante && dictamenData.legajo) ? 'bg-black text-white' : 'bg-gray-100 text-gray-300'}`}>Confirmar Datos</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

const TicketDetailsModal = ({ 
  ticket, 
  onClose, 
  equipmentList, 
  partsList, 
  onPrintDictamen 
}: { 
  ticket: SupportTicket; 
  onClose: () => void; 
  equipmentList: Equipment[]; 
  partsList: SparePart[]; 
  onPrintDictamen: (t: SupportTicket) => void; 
}) => {
  const equip = equipmentList.find(e => e.id === ticket.equipmentId);

  return (
    <div className="fixed inset-0 bg-[#181411]/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
        <div className="p-6 text-white flex justify-between items-center bg-[#4B7349]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">info</span>
            <div>
              <h3 className="font-black uppercase tracking-wider text-sm">Detalle de Intervención</h3>
              <p className="text-white/70 text-[10px] font-black uppercase tracking-tight">{ticket.date} • {ticket.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-white/10 transition-all flex items-center justify-center material-symbols-outlined">close</button>
        </div>

        <div className="p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar">
          {/* General info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-150">
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Técnico Responsable</span>
              <span className="text-sm font-extrabold text-[#3D3D3D]">{ticket.technician}</span>
            </div>
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Fecha de Registro</span>
              <span className="text-sm font-extrabold text-[#3D3D3D]">{ticket.date}</span>
            </div>
          </div>

          {/* Equipment details */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Equipo Vinculado</h4>
            {equip ? (
              <div className="bg-green-50/20 border border-green-150 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-[#4B7349] block">{equip.inventoryId || 'SIN INVENTARIO'}</span>
                    <span className="text-sm font-extrabold text-[#3D3D3D]">{equip.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-400">{equip.brand} {equip.model}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2 text-xs">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Efector / Establecimiento</span>
                    <p className="font-bold text-[#3D3D3D]">{equip.effector}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Servicio / Área</span>
                    <p className="font-bold text-[#3D3D3D]">{equip.service} - {equip.area}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100">Este equipo ya no existe en el sistema.</p>
            )}
          </div>

          {/* Actuación Técnica */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Informe / Descripción del Problema</h4>
            <div className="bg-gray-50 border border-gray-150 p-4 rounded-xl">
              <p className="text-sm text-gray-700 italic font-medium whitespace-pre-wrap">"{ticket.description}"</p>
            </div>
          </div>

          {/* Replaced parts */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Repuestos Utilizados</h4>
            {ticket.affectedParts && ticket.affectedParts.length > 0 ? (
              <div className="flex flex-col gap-2">
                {ticket.affectedParts.map((ap, idx) => {
                  const part = partsList.find(p => p.id === ap.partId);
                  return (
                    <div key={idx} className="bg-white border border-gray-100 flex items-center justify-between p-3 rounded-xl shadow-xs">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-850 uppercase">{part?.name || 'Repuesto Desconocido'}</span>
                        {ap.serial && (
                          <span className="text-[10px] font-mono text-[#4B7349] font-black bg-green-50 px-2 py-0.5 rounded border border-green-150 w-fit mt-1">
                            S/N: {ap.serial}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-gray-400 uppercase block leading-none mb-1">CANTIDAD</span>
                        <span className="text-sm font-extrabold text-[#3D3D3D]">{ap.quantity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No se utilizaron repuestos de stock en esta intervención.</p>
            )}
          </div>

          {/* Dictamen details if Baja */}
          {ticket.type === 'Baja' && ticket.dictamen && (
            <div className="flex flex-col gap-4 bg-red-50/30 p-4 rounded-xl border border-red-100">
              <h4 className="text-[10px] font-black uppercase text-red-600 tracking-wider">Detalles de Baja Definitiva</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-red-400 uppercase">Solicitante</span>
                  <p className="font-bold text-[#3D3D3D]">{ticket.dictamen.solicitante}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-red-400 uppercase">Legajo</span>
                  <p className="font-bold text-[#3D3D3D]">{ticket.dictamen.legajo}</p>
                </div>
              </div>
              {ticket.dictamen.image && (
                <div className="mt-2 border rounded-xl overflow-hidden max-h-40 bg-white shadow-sm">
                  <img src={ticket.dictamen.image} className="w-full h-full object-contain" alt="Adjunto de Baja" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex gap-3 justify-end">
          {ticket.type === 'Baja' && ticket.dictamen && (
            <button 
              onClick={() => {
                onPrintDictamen(ticket);
                onClose();
              }}
              className="px-6 h-12 bg-red-650 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-2 text-xs uppercase shadow-lg shadow-red-900/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Imprimir Dictamen
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 h-12 bg-[#3D3D3D] hover:bg-black text-white rounded-xl font-bold text-xs uppercase"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportView;
