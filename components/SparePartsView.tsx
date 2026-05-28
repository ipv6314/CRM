
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

  const handlePrint = () => {
    window.print();
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
              onClick={() => setEditing({ id: '', name: '', currentStock: 0, minStock: 0, isSerialized: false, serials: [] })}
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
                    {part.isSerialized && (
                      <span className="bg-green-100 text-[#4B7349] text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-green-200 w-fit">
                        Trazabilidad Serial
                      </span>
                    )}
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
    </div>
  );
};

export default SparePartsView;
