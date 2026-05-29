
import React, { useState, useRef, useMemo } from 'react';
import { DB } from '../services/db';
import { SparePart, SparePartLog } from '../types';
import { COLORS } from '../constants';

const SparePartsView: React.FC = () => {
  const [parts, setParts] = useState<SparePart[]>(DB.getSpareParts());
  const [logs, setLogs] = useState<SparePartLog[]>(DB.getSparePartLogs());
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [serialInput, setSerialInput] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [editingMinStockId, setEditingMinStockId] = useState<string | null>(null);
  const [tempMinStock, setTempMinStock] = useState<number>(0);
  
  // States for custom print reports
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printConfig, setPrintConfig] = useState<{
    type: 'category' | 'part' | 'all-cats';
    selectedCategory: string;
    selectedPartId: string;
  }>({
    type: 'all-cats',
    selectedCategory: '',
    selectedPartId: ''
  });
  const [printingReport, setPrintingReport] = useState<any | null>(null);

  const categoriesList = useMemo(() => {
    const cats = parts.map(p => p.category?.trim() || 'General');
    const uniqueCats = Array.from(new Set(cats));
    return uniqueCats.filter(Boolean).sort();
  }, [parts]);

  const currentUser = DB.getCurrentSession();
  const isAdmin = currentUser?.role === 'admin';
  const serialFieldRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshData = () => {
    setParts(DB.getSpareParts());
    setLogs(DB.getSparePartLogs());
  };

  const saveInlineMinStock = (part: SparePart) => {
    const updatedPart = { ...part, minStock: tempMinStock };
    DB.saveSparePart(updatedPart, true);
    refreshData();
    setEditingMinStockId(null);
  };

  const totalStock = useMemo(() => parts.reduce((a, b) => a + b.currentStock, 0), [parts]);
  const criticalCount = useMemo(() => parts.filter(p => p.currentStock < p.minStock).length, [parts]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !isAdmin) return;
    
    let finalPart = { ...editing, id: editing.id || Math.random().toString(36).substr(2, 9) };
    if (finalPart.isSerialized) {
      finalPart.currentStock = finalPart.serials?.length || 0;
    }

    DB.saveSparePart(finalPart, !!editing.id);
    refreshData();
    setEditing(null);
    setSerialInput('');
  };

  const addSerial = () => {
    if (!serialInput.trim() || !editing) return;
    if (editing.serials?.includes(serialInput.trim())) {
      alert("Este número de serie ya está en la lista.");
      setSerialInput('');
      return;
    }
    const newSerials = [...(editing.serials || []), serialInput.trim()];
    setEditing({ ...editing, serials: newSerials, currentStock: newSerials.length });
    setSerialInput('');
    serialFieldRef.current?.focus();
  };

  const removeSerial = (s: string) => {
    if (!editing) return;
    const newSerials = (editing.serials || []).filter(item => item !== s);
    setEditing({ ...editing, serials: newSerials, currentStock: newSerials.length });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const newSerials: string[] = [];
      const existingSerials = new Set(editing.serials || []);

      lines.forEach(line => {
        const values = line.split(/[;,]/);
        values.forEach(val => {
          const trimmed = val.trim();
          if (trimmed && !existingSerials.has(trimmed)) {
            newSerials.push(trimmed);
            existingSerials.add(trimmed);
          }
        });
      });

      if (newSerials.length > 0) {
        const updatedSerials = [...(editing.serials || []), ...newSerials];
        setEditing({ 
          ...editing, 
          serials: updatedSerials, 
          currentStock: updatedSerials.length 
        });
      }
      
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const getCategoryStats = () => {
    const stats: Record<string, { existence: number; consumed: number; partsCount: number }> = {};
    
    // Initialize from existing parts
    parts.forEach(part => {
      const cat = part.category?.trim() || 'General';
      if (!stats[cat]) {
        stats[cat] = { existence: 0, consumed: 0, partsCount: 0 };
      }
      stats[cat].existence += part.currentStock;
      stats[cat].partsCount += 1;
    });

    // Calculate consumed
    const tickets = DB.getTickets();
    tickets.forEach(ticket => {
      if (ticket.affectedParts) {
        ticket.affectedParts.forEach(ap => {
          const part = parts.find(p => p.id === ap.partId);
          if (part) {
            const cat = part.category?.trim() || 'General';
            if (!stats[cat]) {
              stats[cat] = { existence: 0, consumed: 0, partsCount: 0 };
            }
            stats[cat].consumed += ap.quantity;
          }
        });
      }
    });

    return stats;
  };

  const handlePrint = () => {
    setPrintConfig({
      type: 'all-cats',
      selectedCategory: categoriesList[0] || 'General',
      selectedPartId: parts[0]?.id || ''
    });
    setShowPrintModal(true);
  };

  const triggerPrintReport = () => {
    setPrintingReport({
      type: printConfig.type,
      selectedCategory: printConfig.selectedCategory || categoriesList[0] || 'General',
      selectedPartId: printConfig.selectedPartId || parts[0]?.id || ''
    });
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-[#181411]">Stock de Repuestos</h2>
          <p className="text-[#897161]">Control de existencias e historial de movimientos</p>
        </div>
        <div className="flex gap-3 no-print">
          <button 
            onClick={handlePrint}
            className="border-2 border-[#658C2A] text-[#658C2A] px-5 h-11 rounded-xl font-bold flex items-center gap-2 hover:bg-green-50 transition-all"
          >
            <span className="material-symbols-outlined">print</span>
            Imprimir Reporte
          </button>
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="border-2 border-gray-200 text-gray-500 px-5 h-11 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all"
          >
            <span className="material-symbols-outlined">{showLogs ? 'grid_view' : 'history'}</span>
            {showLogs ? 'Ver Stock' : 'Historial de Logs'}
          </button>
          {isAdmin && (
            <button 
              onClick={() => setEditing({ id: '', name: '', category: '', currentStock: 0, minStock: 0, isSerialized: false, serials: [] })}
              className="bg-[#658C2A] text-white px-6 h-11 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-[#457330] transition-all"
            >
              <span className="material-symbols-outlined">add_box</span>
              Nuevo Repuesto
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className={`bg-white p-6 rounded-2xl border ${criticalCount > 0 ? 'border-red-200 bg-red-50/10' : 'border-gray-200'} shadow-sm flex flex-col gap-6 transition-colors`}>
           <div className="flex items-center gap-6">
             <div className={`size-14 rounded-2xl ${criticalCount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-[#4B7349]'} flex items-center justify-center`}>
                <span className="material-symbols-outlined text-3xl">{criticalCount > 0 ? 'warning' : 'check_circle'}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Repuestos bajo Mínimo</span>
                <span className={`text-4xl font-black ${criticalCount > 0 ? 'text-red-600' : 'text-[#4B7349]'}`}>{criticalCount}</span>
             </div>
           </div>
           
           {criticalCount > 0 && (
             <div className="border-t pt-4 flex flex-col gap-2">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalle de faltantes:</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                 {parts.filter(p => p.currentStock < p.minStock).map(p => (
                   <div key={p.id} className="flex justify-between items-center bg-white border border-red-100 px-3 py-2 rounded-lg">
                     <span className="text-xs font-bold text-gray-700">{p.name}</span>
                     <span className="text-xs font-black text-red-600">{p.currentStock} / {p.minStock}</span>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>
      </div>

      {!showLogs ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {parts.map(part => {
            const isCritical = part.currentStock < part.minStock;
            return (
              <div key={part.id} className={`bg-white p-6 rounded-2xl border ${isCritical ? 'border-red-200 bg-red-50/20' : 'border-gray-200'} shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all`}>
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <h4 className="font-black text-[#3D3D3D] leading-tight">{part.name}</h4>
                    <div className="flex flex-wrap gap-1 mt-1 font-sans">
                      {part.category && (
                        <span className="bg-blue-50 text-blue-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-100 w-fit">
                          {part.category}
                        </span>
                      )}
                      {part.isSerialized && (
                        <span className="bg-green-50 text-[#4B7349] text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-green-200 w-fit">
                          S/N
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditing(part)} className="text-blue-500 material-symbols-outlined text-sm hover:bg-blue-50 p-1 rounded">edit</button>
                      <button 
                        onClick={() => {
                          if (confirm(`¿Eliminar ${part.name}?`)) {
                            DB.deleteSparePart(part.id);
                            refreshData();
                          }
                        }} 
                        className="text-red-500 material-symbols-outlined text-sm hover:bg-red-50 p-1 rounded"
                      >
                        delete
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Existencias</span>
                    <span className={`text-3xl font-black ${isCritical ? 'text-red-600' : 'text-[#4B7349]'}`}>{part.currentStock}</span>
                  </div>
                  <div className="flex flex-col text-right">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Mín.</span>
                     {editingMinStockId === part.id ? (
                       <div className="flex items-center gap-1 justify-end mt-1">
                         <input
                           type="number"
                           className="w-14 h-7 text-xs text-right border border-gray-300 rounded px-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-[#658C2A] font-bold"
                           value={tempMinStock}
                           onChange={e => setTempMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                           autoFocus
                           onKeyDown={e => {
                             if (e.key === 'Enter') {
                               saveInlineMinStock(part);
                             } else if (e.key === 'Escape') {
                               setEditingMinStockId(null);
                             }
                           }}
                         />
                         <button 
                           type="button"
                           onClick={() => saveInlineMinStock(part)}
                           className="text-[#658C2A] hover:bg-green-50 p-0.5 rounded transition-all material-symbols-outlined text-sm font-black"
                         >
                           check
                         </button>
                       </div>
                     ) : (
                       <div className="flex items-center gap-1 justify-end group/item font-bold text-gray-600 mt-1">
                         <span className="text-lg font-extrabold">{part.minStock}</span>
                         <button
                           type="button"
                           onClick={() => {
                             setEditingMinStockId(part.id);
                             setTempMinStock(part.minStock);
                           }}
                           className="opacity-0 group-hover:opacity-100 group-hover/item:opacity-100 text-gray-400 hover:text-[#658C2A] hover:bg-green-50 p-1 rounded transition-all material-symbols-outlined text-sm"
                           title="Establecer Stock Crítico"
                         >
                           edit
                         </button>
                       </div>
                     )}
                  </div>
                </div>
                
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${isCritical ? 'bg-red-500' : 'bg-[#658C2A]'}`} 
                    style={{ width: `${Math.min(100, (part.currentStock / (part.minStock * 2 || 1)) * 100)}%` }}
                  ></div>
                </div>

                {part.isSerialized && part.serials && part.serials.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Series en Stock:</p>
                    <div className="flex flex-wrap gap-1">
                      {part.serials.slice(0, 3).map(s => (
                        <span key={s} className="text-[8px] font-mono bg-gray-100 px-1 rounded border">{s}</span>
                      ))}
                      {part.serials.length > 3 && <span className="text-[8px] text-gray-400">+{part.serials.length - 3}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-in slide-in-from-right-4 duration-300">
           <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Logs de Modificaciones</span>
              <span className="text-[10px] font-bold text-[#4B7349] uppercase">Últimos 100 movimientos</span>
           </div>
           <div className="flex flex-col divide-y divide-gray-100 overflow-y-auto max-h-[600px] no-scrollbar">
             {logs.length > 0 ? logs.map(log => (
               <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4">
                 <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                   log.action === 'CREATE' ? 'bg-green-100 text-[#4B7349]' :
                   log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                   log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                   'bg-green-100 text-[#4B7349]'
                 }`}>
                   <span className="material-symbols-outlined text-lg">
                    {log.action === 'CREATE' ? 'add' : log.action === 'UPDATE' ? 'sync' : log.action === 'DELETE' ? 'delete' : 'swap_horiz'}
                   </span>
                 </div>
                 <div className="flex-1">
                   <p className="text-sm font-bold text-[#3D3D3D]">{log.details}</p>
                   <p className="text-[10px] text-gray-400 font-bold uppercase">Por: {log.userName} • {log.timestamp}</p>
                 </div>
                 <span className="text-[9px] font-black uppercase px-2 py-1 bg-gray-100 rounded text-gray-500 border border-gray-200">{log.action}</span>
               </div>
             )) : (
               <div className="p-20 text-center flex flex-col items-center gap-4">
                 <span className="material-symbols-outlined text-5xl text-gray-200">history_edu</span>
                 <p className="text-gray-400 italic font-medium uppercase text-xs tracking-widest">No hay registros de auditoría</p>
               </div>
             )}
           </div>
        </div>
      )}

      {editing && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-[#658C2A] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">inventory_2</span>
                <h3 className="font-black uppercase tracking-widest text-sm">Configuración de Repuesto</h3>
              </div>
              <button onClick={() => setEditing(null)} className="material-symbols-outlined hover:rotate-90 transition-transform">close</button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-gray-400">Identificación</label>
                <input 
                  type="text" 
                  className="h-12 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#658C2A] focus:border-transparent transition-all" 
                  placeholder="Ej: Pantalla LED 14.0 o Disco SSD 480GB"
                  value={editing.name} 
                  onChange={e => setEditing({...editing, name: e.target.value})}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-gray-400">Categoría</label>
                <input 
                  type="text" 
                  className="h-12 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#658C2A] focus:border-transparent transition-all" 
                  placeholder="Ej: Conectividad, Almacenamiento, Pantallas"
                  value={editing.category || ''} 
                  onChange={e => setEditing({...editing, category: e.target.value})}
                  required
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-4">
                <label className="text-xs font-black uppercase text-gray-400">Metodología de Carga</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setEditing({...editing, isSerialized: false, serials: []})}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${!editing.isSerialized ? 'border-[#658C2A] bg-white shadow-sm ring-1 ring-[#658C2A]/20' : 'border-gray-200 text-gray-400 bg-white/50 hover:bg-white'}`}
                  >
                    <span className="material-symbols-outlined text-2xl">widgets</span>
                    <div className="text-center">
                      <p className="text-xs font-bold">Por Lote</p>
                      <p className="text-[9px]">Carga de cantidad general</p>
                    </div>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditing({...editing, isSerialized: true})}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${editing.isSerialized ? 'border-[#4B7349] bg-white shadow-sm ring-1 ring-[#4B7349]/20' : 'border-gray-200 text-gray-400 bg-white/50 hover:bg-white'}`}
                  >
                    <span className="material-symbols-outlined text-2xl">qr_code_2</span>
                    <div className="text-center">
                      <p className="text-xs font-bold">Individual</p>
                      <p className="text-[9px]">Carga por N° de Serie</p>
                    </div>
                  </button>
                </div>
              </div>

              {!editing.isSerialized ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black uppercase text-gray-400">Stock Actual</label>
                    <input 
                      type="number" 
                      className="h-12 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#658C2A]" 
                      value={editing.currentStock} 
                      onChange={e => setEditing({...editing, currentStock: parseInt(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black uppercase text-gray-400">Stock Crítico (Mín)</label>
                    <input 
                      type="number" 
                      className="h-12 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#658C2A]" 
                      value={editing.minStock} 
                      onChange={e => setEditing({...editing, minStock: parseInt(e.target.value) || 0})}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black uppercase text-gray-400">Stock Crítico (Mín)</label>
                    <input 
                      type="number" 
                      className="h-12 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#658C2A] focus:border-transparent transition-all" 
                      value={editing.minStock} 
                      onChange={e => setEditing({...editing, minStock: parseInt(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black uppercase text-gray-400">Ingreso de Números de Serie</label>
                    <div className="flex gap-2">
                      <input 
                        ref={serialFieldRef}
                        type="text" 
                        placeholder="Dispare el escáner o escriba y presione Enter..."
                        className="flex-1 h-12 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#4B7349]" 
                        value={serialInput}
                        onChange={e => setSerialInput(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addSerial(); } }}
                      />
                      <button 
                        type="button" 
                        onClick={addSerial}
                        className="bg-[#3D3D3D] text-white px-4 rounded-xl font-bold text-sm"
                      >
                        AGREGAR
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".csv,.txt" 
                        onChange={handleCsvUpload} 
                      />
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-gray-200 text-gray-500 px-4 rounded-xl font-bold text-xs flex items-center gap-1 hover:bg-gray-50 transition-all"
                        title="Cargar desde CSV"
                      >
                        <span className="material-symbols-outlined text-lg">upload_file</span>
                        CSV
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-300 min-h-[150px]">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-black text-gray-500 uppercase">Items en Lista: {editing.serials?.length || 0}</p>
                      <label className="text-[10px] text-gray-400 flex flex-col text-right">
                        <span>Stock Mínimo Sugerido</span>
                        <input 
                          type="number" 
                          className="w-16 h-6 p-1 text-[10px] text-right border-none bg-transparent font-black"
                          value={editing.minStock}
                          onChange={e => setEditing({...editing, minStock: parseInt(e.target.value) || 0})}
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                      {editing.serials?.map(s => (
                        <div key={s} className="bg-white border flex justify-between items-center px-3 py-2 rounded-lg group shadow-sm">
                          <span className="text-xs font-mono font-bold">{s}</span>
                          <button 
                            type="button" 
                            onClick={() => removeSerial(s)}
                            className="material-symbols-outlined text-sm text-red-400 hover:text-red-600 transition-colors"
                          >
                            close
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="h-14 bg-[#3D3D3D] text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-gray-200 hover:bg-black transition-all mt-4">
                Finalizar y Guardar Repuesto
              </button>
            </form>
          </div>
        </div>
      )}

      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 bg-[#658C2A] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">print</span>
                <h3 className="font-black uppercase tracking-widest text-sm">Opciones de Reporte</h3>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="material-symbols-outlined hover:rotate-90 transition-transform">close</button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase text-gray-400">Seleccione el Tipo de Reporte</span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setPrintConfig({ ...printConfig, type: 'all-cats' })}
                  className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${printConfig.type === 'all-cats' ? 'border-[#658C2A] bg-green-50/20' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <span className="material-symbols-outlined text-2xl text-[#658C2A]">category</span>
                  <div>
                    <h4 className="font-bold text-xs text-[#3D3D3D] uppercase">Todas las Categorías</h4>
                    <span className="text-[10px] text-gray-400 font-medium">Existencias consolidadas y consumidos históricos</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintConfig({ ...printConfig, type: 'category', selectedCategory: printConfig.selectedCategory || categoriesList[0] || 'General' })}
                  className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${printConfig.type === 'category' ? 'border-[#658C2A] bg-green-50/20' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <span className="material-symbols-outlined text-2xl text-[#658C2A]">folder_special</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-[#3D3D3D] uppercase">Por Categoría en Particular</h4>
                    <span className="text-[10px] text-gray-400 font-medium block mb-2">Detalle pormenorizado de una categoría</span>
                    {printConfig.type === 'category' && (
                      <select
                        className="w-full text-xs h-9 border rounded-lg px-2 bg-white"
                        value={printConfig.selectedCategory}
                        onChange={(e) => setPrintConfig({ ...printConfig, selectedCategory: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {categoriesList.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintConfig({ ...printConfig, type: 'part', selectedPartId: printConfig.selectedPartId || parts[0]?.id || '' })}
                  className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${printConfig.type === 'part' ? 'border-[#658C2A] bg-green-50/20' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <span className="material-symbols-outlined text-2xl text-[#658C2A]">widgets</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-[#3D3D3D] uppercase">Por Repuesto Particular</h4>
                    <span className="text-[10px] text-gray-400 font-medium block mb-2">Ficha individual y trazabilidad (series)</span>
                    {printConfig.type === 'part' && (
                      <select
                        className="w-full text-xs h-9 border rounded-lg px-2 bg-white"
                        value={printConfig.selectedPartId}
                        onChange={(e) => setPrintConfig({ ...printConfig, selectedPartId: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.category || 'Sin Cat'})</option>
                        ))}
                      </select>
                    )}
                  </div>
                </button>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={triggerPrintReport}
                className="px-5 py-2 bg-[#658C2A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#457330] uppercase"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {printingReport && (
        <div id="print-section" className="hidden bg-white p-8 text-black font-sans min-h-[1050px] flex-col w-full text-left">
          {(() => {
            if (printingReport.type === 'category') {
              const catName = printingReport.selectedCategory;
              const filteredParts = parts.filter(p => (p.category?.trim() || 'General') === catName);
              return (
                <div className="w-full flex flex-col gap-6">
                  <div className="border-b-4 border-[#4B7349] pb-4 flex justify-between items-end">
                    <div>
                      <h1 className="text-2xl font-black uppercase text-gray-800 tracking-tight">CRM Técnico - Reporte de Stock</h1>
                      <p className="text-xs font-bold text-[#4B7349] uppercase tracking-wider">Detalle por Categoría de Repuestos</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 font-bold uppercase">
                      <p>Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                      <p>Categoría: {catName}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-bold text-gray-700 uppercase">Resumen de la Categoría: {catName}</h2>
                    <p className="text-xs text-gray-500">Se listan todos los repuestos pertenecientes a la categoría seleccionada, su estado de stock y de trazabilidad.</p>
                  </div>

                  <table className="w-full border-collapse mt-4 text-xs">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300 text-left">
                        <th className="px-4 py-3 font-black text-gray-600 uppercase">Repuesto</th>
                        <th className="px-4 py-3 font-black text-gray-600 uppercase">Trazabilidad</th>
                        <th className="px-4 py-3 font-black text-gray-600 uppercase text-right">Mínimo Crítico</th>
                        <th className="px-4 py-3 font-black text-gray-600 uppercase text-right">Existencia Actual</th>
                        <th className="px-4 py-3 font-black text-gray-600 uppercase text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredParts.map(p => {
                        const isCritical = p.currentStock < p.minStock;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-bold text-gray-800">{p.name}</td>
                            <td className="px-4 py-3 font-medium text-gray-500">{p.isSerialized ? 'Individual (Serial)' : 'Por Lote'}</td>
                            <td className="px-4 py-3 font-bold text-right text-gray-600">{p.minStock}</td>
                            <td className={`px-4 py-3 font-black text-right text-lg ${isCritical ? 'text-red-600' : 'text-[#4B7349]'}`}>{p.currentStock}</td>
                            <td className="px-4 py-3 font-black text-right uppercase">
                              <span className={isCritical ? 'text-red-600' : 'text-[#4B7349]'}>
                                {isCritical ? 'BAJO MÍNIMO' : 'NORMAL'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <span>Ateneo CRM Técnico v2.5 Suite</span>
                    <span>Página 1 de 1</span>
                  </div>
                </div>
              );
            }

            if (printingReport.type === 'part') {
              const part = parts.find(p => p.id === printingReport.selectedPartId);
              if (!part) return <p className="text-red-500 font-bold">Error: Repuesto no seleccionado o inexistente.</p>;

              const isCritical = part.currentStock < part.minStock;
              let partConsumed = 0;
              const tickets = DB.getTickets();
              tickets.forEach(t => {
                if (t.affectedParts) {
                  t.affectedParts.forEach(ap => {
                    if (ap.partId === part.id) partConsumed += ap.quantity;
                  });
                }
              });

              return (
                <div className="w-full flex flex-col gap-6">
                  <div className="border-b-4 border-[#4B7349] pb-4 flex justify-between items-end">
                    <div>
                      <h1 className="text-2xl font-black uppercase text-gray-800 tracking-tight">CRM Técnico - Reporte de Stock</h1>
                      <p className="text-xs font-bold text-[#4B7349] uppercase tracking-wider">Detalle de Repuesto Particular</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 font-bold uppercase">
                      <p>Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                      <p>ID: {part.id}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl border flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Categoría</span>
                        <span className="text-[#4B7349] font-black uppercase tracking-wide text-xs">{part.category || 'General'}</span>
                        <h2 className="text-xl font-black text-gray-800 uppercase mt-1">{part.name}</h2>
                      </div>
                      <span className={`px-3 py-1 text-xs font-black uppercase rounded-full ${isCritical ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-[#4B7349] border border-green-200'}`}>
                        {isCritical ? 'BAJO MÍNIMO' : 'STOCK CORRECTO'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-2">
                      <div className="bg-white p-3 rounded-xl border text-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase block">Existencia Actual</span>
                        <span className="text-xl font-black text-gray-800">{part.currentStock}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border text-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase block">Stock Crítico Mín.</span>
                        <span className="text-xl font-black text-gray-800">{part.minStock}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border text-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase block">Histórico Consumidos</span>
                        <span className="text-xl font-black text-gray-800">{partConsumed}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border text-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase block">Tipo Trazabilidad</span>
                        <span className="text-[10px] font-black text-gray-600 uppercase block mt-1">{part.isSerialized ? 'Números de Serie' : 'Por Lote'}</span>
                      </div>
                    </div>
                  </div>

                  {part.isSerialized && part.serials && part.serials.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-black text-gray-600 uppercase tracking-wider">Listado de Números de Serie Disponibles en Stock:</h3>
                      <div className="grid grid-cols-3 gap-2 border p-4 rounded-xl">
                        {part.serials.map(s => (
                          <div key={s} className="bg-gray-50 border p-2 text-center text-xs font-mono font-bold rounded">
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <span>Ateneo CRM Técnico v2.5 Suite</span>
                    <span>Página 1 de 1</span>
                  </div>
                </div>
              );
            }

            if (printingReport.type === 'all-cats') {
              const stats = getCategoryStats();
              return (
                <div className="w-full flex flex-col gap-6">
                  <div className="border-b-4 border-[#4B7349] pb-4 flex justify-between items-end">
                    <div>
                      <h1 className="text-2xl font-black uppercase text-gray-800 tracking-tight">CRM Técnico - Reporte de Stock</h1>
                      <p className="text-xs font-bold text-[#4B7349] uppercase tracking-wider">Consolidado Total por Categorías</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 font-bold uppercase">
                      <p>Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                      <p>Módulo de Control</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-bold text-gray-700 uppercase">Resumen de Existencias y Consumos</h2>
                    <p className="text-xs text-gray-500">Este reporte resume el stock consolidado (repuestos en existencia) y los consumos (repuestos históricamente utilizados en soporte técnico) agrupados por cada una de las categorías registradas en el sistema.</p>
                  </div>

                  <table className="w-full border-collapse mt-4 text-xs">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300 text-left">
                        <th className="px-4 py-3 font-black text-gray-600 uppercase">Categoría</th>
                        <th className="px-4 py-3 font-black text-gray-600 uppercase text-center">Repuestos Registrados</th>
                        <th className="px-4 py-3 font-black text-gray-600 uppercase text-right">Existencias Disponibles</th>
                        <th className="px-4 py-3 font-black text-gray-600 uppercase text-right">Histórico Consumidos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.keys(stats).map(catName => {
                        const s = stats[catName];
                        return (
                          <tr key={catName} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-black text-gray-850 uppercase">{catName}</td>
                            <td className="px-4 py-3 font-bold text-center text-gray-650">{s.partsCount}</td>
                            <td className="px-4 py-3 font-black text-right text-lg text-emerald-800">{s.existence}</td>
                            <td className="px-4 py-3 font-black text-right text-lg text-amber-700">{s.consumed}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <span>Ateneo CRM Técnico v2.5 Suite</span>
                    <span>Página 1 de 1</span>
                  </div>
                </div>
              );
            }

            return null;
          })()}
        </div>
      )}
    </div>
  );
};

export default SparePartsView;
