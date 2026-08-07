import React, { useState, useMemo } from 'react';
import { DB } from '../services/db';
import { Supply, SupplyDeduction, SupplyLog } from '../types';

const SuppliesView: React.FC = () => {
  const [supplies, setSupplies] = useState<Supply[]>(DB.getSupplies());
  const [deductions, setDeductions] = useState<SupplyDeduction[]>(DB.getSupplyDeductions());
  const [logs, setLogs] = useState<SupplyLog[]>(DB.getSupplyLogs());

  // Active sub-tab: 'stock' | 'deduct' | 'history' | 'logs'
  const [activeTab, setActiveTab] = useState<'stock' | 'deduct' | 'history' | 'logs'>('stock');

  // Editing Supply Modal State
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  
  // Inline minStock editing
  const [editingMinStockId, setEditingMinStockId] = useState<string | null>(null);
  const [tempMinStock, setTempMinStock] = useState<number>(0);

  // Deduction Form State
  const [deductionForm, setDeductionForm] = useState<{
    supplyId: string;
    date: string;
    destination: string;
    project: string;
    quantity: number;
    notes: string;
  }>({
    supplyId: supplies[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    destination: '',
    project: '',
    quantity: 1,
    notes: ''
  });

  // Search filter for History
  const [historySearch, setHistorySearch] = useState('');

  // Print Report States
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printConfig, setPrintConfig] = useState<{
    type: 'all' | 'supply' | 'project';
    selectedSupplyId: string;
    selectedProject: string;
  }>({
    type: 'all',
    selectedSupplyId: '',
    selectedProject: ''
  });
  const [printingReport, setPrintingReport] = useState<any | null>(null);

  const currentUser = DB.getCurrentSession();
  const isAdmin = currentUser?.role === 'admin';

  const refreshData = () => {
    setSupplies(DB.getSupplies());
    setDeductions(DB.getSupplyDeductions());
    setLogs(DB.getSupplyLogs());
  };

  const categoriesList = useMemo(() => {
    const cats = supplies.map(s => s.category?.trim() || 'General');
    return Array.from(new Set(cats)).sort();
  }, [supplies]);

  const projectsList = useMemo(() => {
    const projs = deductions.map(d => d.project?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(projs)).sort();
  }, [deductions]);

  const criticalSupplies = useMemo(() => {
    return supplies.filter(s => s.currentStock < s.minStock);
  }, [supplies]);

  const criticalCount = criticalSupplies.length;

  // Deduction Submit Handler
  const handleDeductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionForm.supplyId || !deductionForm.date || !deductionForm.destination || deductionForm.quantity <= 0) {
      alert('Por favor complete todos los campos obligatorios: Fecha, Destino, Insumo y Cantidad.');
      return;
    }

    const targetSupply = supplies.find(s => s.id === deductionForm.supplyId);
    if (!targetSupply) {
      alert('El insumo seleccionado no existe.');
      return;
    }

    if (deductionForm.quantity > targetSupply.currentStock) {
      if (!confirm(`Advertencia: La cantidad a descontar (${deductionForm.quantity}) supera el stock disponible (${targetSupply.currentStock}). ¿Desea continuar de todos modos?`)) {
        return;
      }
    }

    // Format date nicely for display if string is YYYY-MM-DD
    let formattedDate = deductionForm.date;
    if (deductionForm.date.includes('-')) {
      const [year, month, day] = deductionForm.date.split('-');
      formattedDate = `${day}/${month}/${year}`;
    }

    const newDeduction: SupplyDeduction = {
      id: Math.random().toString(36).substr(2, 9),
      supplyId: targetSupply.id,
      supplyName: targetSupply.name,
      category: targetSupply.category || 'General',
      date: formattedDate,
      destination: deductionForm.destination.trim(),
      project: deductionForm.project.trim() || undefined,
      quantity: Number(deductionForm.quantity),
      registeredBy: currentUser?.name || 'Administrador',
      notes: deductionForm.notes.trim() || undefined,
      timestamp: new Date().toLocaleString('es-AR')
    };

    DB.deductSupplyStock(newDeduction);
    refreshData();

    alert(`✅ Insumo descontado exitosamente: ${deductionForm.quantity} ${targetSupply.unit || 'unidades'} de ${targetSupply.name}`);

    // Reset form
    setDeductionForm({
      supplyId: targetSupply.id,
      date: new Date().toISOString().split('T')[0],
      destination: '',
      project: '',
      quantity: 1,
      notes: ''
    });

    setActiveTab('history');
  };

  // Save Supply Handler (Create/Update)
  const handleSaveSupply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupply || !isAdmin) return;

    const isUpdate = !!editingSupply.id;
    const finalSupply: Supply = {
      ...editingSupply,
      id: editingSupply.id || Math.random().toString(36).substr(2, 9),
      name: editingSupply.name.trim(),
      category: editingSupply.category?.trim() || 'General',
      unit: editingSupply.unit?.trim() || 'Unidades',
      currentStock: Number(editingSupply.currentStock) || 0,
      minStock: Number(editingSupply.minStock) || 0,
      comments: editingSupply.comments?.trim() || undefined
    };

    DB.saveSupply(finalSupply, isUpdate);
    refreshData();
    setEditingSupply(null);
  };

  const saveInlineMinStock = (supply: Supply) => {
    const updated = { ...supply, minStock: tempMinStock };
    DB.saveSupply(updated, true);
    refreshData();
    setEditingMinStockId(null);
  };

  // Print Report Handler
  const handlePrintModalOpen = () => {
    setPrintConfig({
      type: 'all',
      selectedSupplyId: supplies[0]?.id || '',
      selectedProject: projectsList[0] || ''
    });
    setShowPrintModal(true);
  };

  const triggerPrintReport = () => {
    setPrintingReport({
      type: printConfig.type,
      selectedSupplyId: printConfig.selectedSupplyId || supplies[0]?.id || '',
      selectedProject: printConfig.selectedProject || projectsList[0] || ''
    });
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // Filtered deductions for history
  const filteredDeductions = useMemo(() => {
    if (!historySearch.trim()) return deductions;
    const term = historySearch.toLowerCase();
    return deductions.filter(d => 
      d.supplyName.toLowerCase().includes(term) ||
      d.destination.toLowerCase().includes(term) ||
      (d.project && d.project.toLowerCase().includes(term)) ||
      d.date.includes(term) ||
      d.registeredBy.toLowerCase().includes(term)
    );
  }, [deductions, historySearch]);

  // Calculate historical usage per supply
  const getSupplyTotalConsumed = (supplyId: string) => {
    return deductions
      .filter(d => d.supplyId === supplyId)
      .reduce((acc, curr) => acc + curr.quantity, 0);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-[#4B7349]">box</span>
            <h2 className="text-3xl font-black text-[#181411]">Control de Insumos</h2>
          </div>
          <p className="text-[#897161]">Gestión de existencias, egresos por proyecto y reportes de uso</p>
        </div>

        <div className="flex flex-wrap gap-2 no-print">
          <button 
            onClick={handlePrintModalOpen}
            className="border-2 border-[#658C2A] text-[#658C2A] px-5 h-11 rounded-xl font-bold flex items-center gap-2 hover:bg-green-50 transition-all text-xs uppercase"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Imprimir Reporte
          </button>
          
          <button 
            onClick={() => setActiveTab('deduct')}
            className={`px-5 h-11 rounded-xl font-bold flex items-center gap-2 transition-all text-xs uppercase ${
              activeTab === 'deduct' 
                ? 'bg-[#3D3D3D] text-white shadow-md' 
                : 'bg-amber-500/10 text-amber-700 border-2 border-amber-300 hover:bg-amber-50'
            }`}
          >
            <span className="material-symbols-outlined text-base">output</span>
            Descontar Insumo
          </button>

          {isAdmin && (
            <button 
              onClick={() => setEditingSupply({ id: '', name: '', category: 'General', unit: 'Unidades', currentStock: 0, minStock: 0 })}
              className="bg-[#658C2A] text-white px-5 h-11 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-[#457330] transition-all text-xs uppercase"
            >
              <span className="material-symbols-outlined text-base">add_box</span>
              Nuevo Insumo
            </button>
          )}
        </div>
      </div>

      {/* Alertas de Stock Crítico Banner (Igual a la sección Repuestos) */}
      <div className={`bg-white p-6 rounded-2xl border ${criticalCount > 0 ? 'border-red-200 bg-red-50/20' : 'border-gray-200'} shadow-sm flex flex-col gap-5 transition-colors`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className={`size-12 rounded-2xl ${criticalCount > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-[#4B7349]'} flex items-center justify-center`}>
              <span className="material-symbols-outlined text-2xl">{criticalCount > 0 ? 'warning' : 'check_circle'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Insumos bajo Stock Mínimo</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${criticalCount > 0 ? 'text-red-600' : 'text-[#4B7349]'}`}>{criticalCount}</span>
                <span className="text-xs font-bold text-gray-500">de {supplies.length} insumos en catálogo</span>
              </div>
            </div>
          </div>

          {criticalCount > 0 && (
            <span className="bg-red-100 text-red-700 font-black text-[10px] uppercase px-3 py-1 rounded-full border border-red-200">
              ¡Atención Requerida!
            </span>
          )}
        </div>

        {criticalCount > 0 && (
          <div className="border-t border-red-100 pt-4 flex flex-col gap-2">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Detalle de Insumos Faltantes / Críticos:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {criticalSupplies.map(s => (
                <div key={s.id} className="flex justify-between items-center bg-white border border-red-200 px-3 py-2 rounded-xl shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-800">{s.name}</span>
                    <span className="text-[9px] text-gray-400 uppercase font-black">{s.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-red-600 block">{s.currentStock} {s.unit}</span>
                    <span className="text-[9px] text-gray-400">Mín: {s.minStock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-200 gap-2 no-print overflow-x-auto">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 px-4 font-bold text-xs uppercase flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'stock'
              ? 'border-[#4B7349] text-[#4B7349]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="material-symbols-outlined text-lg">inventory_2</span>
          Catálogo & Stock ({supplies.length})
        </button>

        <button
          onClick={() => setActiveTab('deduct')}
          className={`pb-3 px-4 font-bold text-xs uppercase flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'deduct'
              ? 'border-[#4B7349] text-[#4B7349]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="material-symbols-outlined text-lg">remove_circle_outline</span>
          Descontar Insumo
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 font-bold text-xs uppercase flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-[#4B7349] text-[#4B7349]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="material-symbols-outlined text-lg">history</span>
          Historial de Salidas ({deductions.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-4 font-bold text-xs uppercase flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'logs'
              ? 'border-[#4B7349] text-[#4B7349]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="material-symbols-outlined text-lg">history_edu</span>
          Logs de Auditoría
        </button>
      </div>

      {/* TAB 1: Stock / Catálogo */}
      {activeTab === 'stock' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {supplies.map(supply => {
            const isCritical = supply.currentStock < supply.minStock;
            const consumedTotal = getSupplyTotalConsumed(supply.id);

            return (
              <div 
                key={supply.id} 
                className={`bg-white p-6 rounded-2xl border ${isCritical ? 'border-red-200 bg-red-50/10' : 'border-gray-200'} shadow-sm flex flex-col justify-between gap-5 group hover:shadow-md transition-all relative`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="bg-blue-50 text-blue-700 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-blue-100 w-fit">
                      {supply.category || 'General'}
                    </span>
                    <h4 className="font-black text-[#181411] text-base leading-tight mt-1">{supply.name}</h4>
                    {supply.comments && <p className="text-xs text-gray-400 font-medium line-clamp-1">{supply.comments}</p>}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingSupply(supply)} 
                        className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg material-symbols-outlined text-base"
                        title="Editar Insumo"
                      >
                        edit
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`¿Esta seguro de eliminar el insumo "${supply.name}"?`)) {
                            DB.deleteSupply(supply.id);
                            refreshData();
                          }
                        }} 
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg material-symbols-outlined text-base"
                        title="Eliminar Insumo"
                      >
                        delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Disponible</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-black ${isCritical ? 'text-red-600' : 'text-[#4B7349]'}`}>
                        {supply.currentStock}
                      </span>
                      <span className="text-xs font-bold text-gray-500">{supply.unit || 'unidades'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Mínimo</span>
                    {editingMinStockId === supply.id ? (
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <input
                          type="number"
                          className="w-14 h-7 text-xs text-right border border-gray-300 rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-[#658C2A] font-bold"
                          value={tempMinStock}
                          onChange={e => setTempMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveInlineMinStock(supply);
                            else if (e.key === 'Escape') setEditingMinStockId(null);
                          }}
                        />
                        <button 
                          type="button"
                          onClick={() => saveInlineMinStock(supply)}
                          className="text-[#658C2A] hover:bg-green-50 p-0.5 rounded material-symbols-outlined text-sm font-black"
                        >
                          check
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end group/item font-bold text-gray-600 mt-1">
                        <span className="text-base font-extrabold">{supply.minStock}</span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMinStockId(supply.id);
                              setTempMinStock(supply.minStock);
                            }}
                            className="opacity-0 group-hover:opacity-100 group-hover/item:opacity-100 text-gray-400 hover:text-[#658C2A] hover:bg-green-50 p-1 rounded material-symbols-outlined text-xs"
                            title="Modificar Stock Crítico Mínimo"
                          >
                            edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1">
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ${isCritical ? 'bg-red-500' : 'bg-[#658C2A]'}`} 
                      style={{ width: `${Math.min(100, (supply.currentStock / (supply.minStock * 2 || 1)) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                    <span>Uso Histórico: {consumedTotal} {supply.unit || 'ud.'}</span>
                    <span className={isCritical ? 'text-red-600 font-black' : 'text-[#4B7349]'}>
                      {isCritical ? '⚠️ RECOMPRAR' : 'OK'}
                    </span>
                  </div>
                </div>

                {/* Quick Action Button to Deduct this item */}
                <button
                  onClick={() => {
                    setDeductionForm(prev => ({ ...prev, supplyId: supply.id }));
                    setActiveTab('deduct');
                  }}
                  className="w-full h-10 border-2 border-gray-200 hover:border-[#4B7349] hover:bg-[#4B7349]/5 text-[#3D3D3D] hover:text-[#4B7349] rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all mt-1"
                >
                  <span className="material-symbols-outlined text-base">output</span>
                  Descontar Insumo
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Sub-sección Descontar Insumo */}
      {activeTab === 'deduct' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 max-w-3xl mx-auto w-full animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 border-b pb-4 mb-6">
            <div className="size-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">remove_circle_outline</span>
            </div>
            <div>
              <h3 className="text-xl font-black text-[#181411]">Formulario de Descuento de Insumos</h3>
              <p className="text-xs text-gray-500 font-medium">Registre la salida de insumos indicando la fecha, el destino y el proyecto correspondiente.</p>
            </div>
          </div>

          <form onSubmit={handleDeductSubmit} className="flex flex-col gap-6">
            {/* Supply Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-gray-500 flex items-center justify-between">
                <span>Insumo a Descontar <span className="text-red-500">*</span></span>
                {deductionForm.supplyId && (
                  <span className="text-[11px] text-[#4B7349] font-bold">
                    Stock Disponible: {supplies.find(s => s.id === deductionForm.supplyId)?.currentStock || 0} {supplies.find(s => s.id === deductionForm.supplyId)?.unit || 'unidades'}
                  </span>
                )}
              </label>
              <select
                required
                value={deductionForm.supplyId}
                onChange={e => setDeductionForm({ ...deductionForm, supplyId: e.target.value })}
                className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:bg-white text-sm font-bold text-[#181411] transition-all"
              >
                {supplies.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category || 'General'}) — Available: {s.currentStock} {s.unit || 'ud.'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Fecha (Obligatorio) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-gray-500">
                  Fecha <span className="text-red-500">* (Obligatorio)</span>
                </label>
                <input
                  type="date"
                  required
                  value={deductionForm.date}
                  onChange={e => setDeductionForm({ ...deductionForm, date: e.target.value })}
                  className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:bg-white text-sm font-bold transition-all"
                />
              </div>

              {/* Cantidad (Obligatorio) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-gray-500">
                  Cantidad <span className="text-red-500">* (Obligatorio)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={deductionForm.quantity}
                  onChange={e => setDeductionForm({ ...deductionForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:bg-white text-sm font-bold transition-all"
                  placeholder="Ej: 2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Destino (Obligatorio) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-gray-500">
                  Destino / Área / Oficina <span className="text-red-500">* (Obligatorio)</span>
                </label>
                <input
                  type="text"
                  required
                  value={deductionForm.destination}
                  onChange={e => setDeductionForm({ ...deductionForm, destination: e.target.value })}
                  placeholder="Ej: Oficina de Personal, Consultorio 2, Mesa de Entrada"
                  className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:bg-white text-sm font-bold transition-all"
                />
              </div>

              {/* Proyecto (Campo opcional/complementario) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-gray-500">
                  Proyecto
                </label>
                <input
                  type="text"
                  value={deductionForm.project}
                  onChange={e => setDeductionForm({ ...deductionForm, project: e.target.value })}
                  placeholder="Ej: Campaña de Digitalización 2026, Mantenimiento Red"
                  className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:bg-white text-sm font-bold transition-all"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-gray-500">
                Observaciones / Motivo
              </label>
              <textarea
                value={deductionForm.notes}
                onChange={e => setDeductionForm({ ...deductionForm, notes: e.target.value })}
                rows={3}
                placeholder="Detalle adicional sobre el uso o retiro del insumo..."
                className="p-4 rounded-2xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:bg-white text-sm font-medium transition-all"
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className="px-6 h-12 border-2 border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl font-bold text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-8 h-12 bg-[#4B7349] hover:bg-[#3f613d] text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-green-900/10 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Confirmar Descuento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Historial de Descuentos */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col gap-4 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
            <div className="flex flex-col">
              <h3 className="font-black text-lg text-[#181411]">Historial de Egresos y Descuentos</h3>
              <p className="text-xs text-gray-400 font-medium">Registro detallado de salidas de insumos</p>
            </div>

            <div className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-lg">search</span>
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Buscar por insumo, destino, proyecto..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold focus:ring-2 focus:ring-[#4B7349]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-black uppercase text-[10px] tracking-wider">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Insumo</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Destino (Obligatorio)</th>
                  <th className="p-3">Proyecto</th>
                  <th className="p-3">Registrado Por</th>
                  <th className="p-3">Observaciones</th>
                  {isAdmin && <th className="p-3 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredDeductions.length > 0 ? (
                  filteredDeductions.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3 font-bold text-gray-800 whitespace-nowrap">{item.date}</td>
                      <td className="p-3">
                        <span className="font-black text-[#181411] block">{item.supplyName}</span>
                        {item.category && <span className="text-[9px] text-blue-600 font-bold uppercase">{item.category}</span>}
                      </td>
                      <td className="p-3">
                        <span className="font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-xs">
                          -{item.quantity}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-gray-700">{item.destination}</td>
                      <td className="p-3">
                        {item.project ? (
                          <span className="bg-green-50 text-[#4B7349] font-bold px-2 py-0.5 rounded-full border border-green-200 text-[10px]">
                            {item.project}
                          </span>
                        ) : (
                          <span className="text-gray-300 italic text-[10px]">N/A</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-500 font-bold">{item.registeredBy}</td>
                      <td className="p-3 text-gray-500 max-w-xs truncate">{item.notes || '—'}</td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar el registro de descuento de ${item.supplyName}?`)) {
                                DB.deleteSupplyDeduction(item.id);
                                refreshData();
                              }
                            }}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg material-symbols-outlined text-sm"
                            title="Eliminar Registro"
                          >
                            delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400 italic">
                      No se encontraron registros de salidas de insumos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-in fade-in duration-200">
          <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
            <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Logs de Auditoría de Insumos</span>
            <span className="text-[10px] font-bold text-[#4B7349] uppercase">Movimientos del Sistema</span>
          </div>
          <div className="flex flex-col divide-y divide-gray-100 overflow-y-auto max-h-[600px]">
            {logs.length > 0 ? (
              logs.map(log => (
                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4">
                  <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                    log.action === 'CREATE' ? 'bg-green-100 text-[#4B7349]' :
                    log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                    log.action === 'DEDUCT' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    <span className="material-symbols-outlined text-lg">
                      {log.action === 'CREATE' ? 'add' : log.action === 'UPDATE' ? 'sync' : log.action === 'DEDUCT' ? 'output' : 'delete'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#3D3D3D]">{log.details}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Por: {log.userName} • {log.timestamp}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-1 bg-gray-100 rounded text-gray-500 border border-gray-200">{log.action}</span>
                </div>
              ))
            ) : (
              <div className="p-16 text-center text-gray-400 italic">No hay logs registrados.</div>
            )}
          </div>
        </div>
      )}

      {/* Modal Cargar / Editar Insumo (Admin) */}
      {editingSupply && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 bg-[#4B7349] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">box</span>
                <h3 className="font-black uppercase tracking-widest text-sm">
                  {editingSupply.id ? 'Editar Insumo' : 'Nuevo Insumo'}
                </h3>
              </div>
              <button onClick={() => setEditingSupply(null)} className="material-symbols-outlined hover:rotate-90 transition-transform">close</button>
            </div>

            <form onSubmit={handleSaveSupply} className="p-8 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase text-gray-400">Nombre del Insumo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tóner HP 85A, Resma Papel A4, Cable UTP"
                  value={editingSupply.name}
                  onChange={e => setEditingSupply({ ...editingSupply, name: e.target.value })}
                  className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase text-gray-400">Categoría</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Impresión, Papelería, Redes"
                    value={editingSupply.category || ''}
                    onChange={e => setEditingSupply({ ...editingSupply, category: e.target.value })}
                    className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] text-sm font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase text-gray-400">Unidad de Medida</label>
                  <select
                    value={editingSupply.unit || 'Unidades'}
                    onChange={e => setEditingSupply({ ...editingSupply, unit: e.target.value })}
                    className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] text-sm font-bold"
                  >
                    <option value="Unidades">Unidades</option>
                    <option value="Resmas">Resmas</option>
                    <option value="Metros">Metros</option>
                    <option value="Rollos">Rollos</option>
                    <option value="Litros">Litros</option>
                    <option value="Cajas">Cajas</option>
                    <option value="Kilos">Kilos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase text-gray-400">Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingSupply.currentStock}
                    onChange={e => setEditingSupply({ ...editingSupply, currentStock: parseInt(e.target.value) || 0 })}
                    className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] text-sm font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase text-gray-400">Stock Crítico Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingSupply.minStock}
                    onChange={e => setEditingSupply({ ...editingSupply, minStock: parseInt(e.target.value) || 0 })}
                    className="h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase text-gray-400">Observaciones / Notas</label>
                <textarea
                  rows={2}
                  value={editingSupply.comments || ''}
                  onChange={e => setEditingSupply({ ...editingSupply, comments: e.target.value })}
                  placeholder="Detalles técnicos o del proveedor..."
                  className="p-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] text-sm font-medium"
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setEditingSupply(null)}
                  className="px-6 h-12 border-2 border-gray-200 text-gray-500 rounded-xl font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 h-12 bg-[#4B7349] hover:bg-[#3f613d] text-white rounded-xl font-bold text-xs uppercase shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  Guardar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Opciones de Reporte */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 bg-[#4B7349] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">print</span>
                <h3 className="font-black uppercase tracking-widest text-sm">Reportes de Insumos</h3>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="material-symbols-outlined hover:rotate-90 transition-transform">close</button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase text-gray-400">Seleccione la Modalidad del Reporte</span>

              <button
                type="button"
                onClick={() => setPrintConfig({ ...printConfig, type: 'all' })}
                className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${printConfig.type === 'all' ? 'border-[#4B7349] bg-green-50/20' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <span className="material-symbols-outlined text-2xl text-[#4B7349]">assessment</span>
                <div>
                  <h4 className="font-bold text-xs text-[#3D3D3D] uppercase">Consolidado Total de Insumos</h4>
                  <span className="text-[10px] text-gray-400 font-medium">Listado global de existencias, stocks críticos y egresos acumulados</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrintConfig({ ...printConfig, type: 'supply', selectedSupplyId: printConfig.selectedSupplyId || supplies[0]?.id || '' })}
                className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${printConfig.type === 'supply' ? 'border-[#4B7349] bg-green-50/20' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <span className="material-symbols-outlined text-2xl text-[#4B7349]">box</span>
                <div className="flex-1">
                  <h4 className="font-bold text-xs text-[#3D3D3D] uppercase">Reporte por Insumo Particular (Histórico)</h4>
                  <span className="text-[10px] text-gray-400 font-medium block mb-2">Ficha de uso detallado y trazabilidad de salidas</span>
                  {printConfig.type === 'supply' && (
                    <select
                      className="w-full text-xs h-9 border rounded-lg px-2 bg-white font-bold"
                      value={printConfig.selectedSupplyId}
                      onChange={e => setPrintConfig({ ...printConfig, selectedSupplyId: e.target.value })}
                    >
                      {supplies.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.category || 'General'})</option>
                      ))}
                    </select>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrintConfig({ ...printConfig, type: 'project', selectedProject: printConfig.selectedProject || projectsList[0] || '' })}
                className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${printConfig.type === 'project' ? 'border-[#4B7349] bg-green-50/20' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <span className="material-symbols-outlined text-2xl text-[#4B7349]">folder_special</span>
                <div className="flex-1">
                  <h4 className="font-bold text-xs text-[#3D3D3D] uppercase">Reporte por Proyecto o Destino</h4>
                  <span className="text-[10px] text-gray-400 font-medium block mb-2">Resumen de consumo agrupado por proyecto</span>
                  {printConfig.type === 'project' && (
                    projectsList.length > 0 ? (
                      <select
                        className="w-full text-xs h-9 border rounded-lg px-2 bg-white font-bold"
                        value={printConfig.selectedProject}
                        onChange={e => setPrintConfig({ ...printConfig, selectedProject: e.target.value })}
                      >
                        {projectsList.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[10px] text-red-500 italic">No hay proyectos registrados aún.</p>
                    )
                  )}
                </div>
              </button>
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
                className="px-5 py-2 bg-[#4B7349] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#3f613d] uppercase"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                Imprimir Reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Area (`#print-section`) */}
      {printingReport && (
        <div id="print-section" className="hidden bg-white p-8 text-black font-sans min-h-[1050px] flex-col w-full text-left">
          {(() => {
            if (printingReport.type === 'all') {
              return (
                <div className="w-full flex flex-col gap-6">
                  <div className="border-b-4 border-[#4B7349] pb-4 flex justify-between items-end">
                    <div>
                      <h1 className="text-2xl font-black uppercase text-gray-800 tracking-tight">CRM Técnico - Reporte de Insumos</h1>
                      <p className="text-xs font-bold text-[#4B7349] uppercase tracking-wider">Consolidado General de Existencias y Uso</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 font-bold uppercase">
                      <p>Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                      <p>Módulo de Control de Insumos</p>
                    </div>
                  </div>

                  <table className="w-full border-collapse text-xs mt-4">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300 text-left">
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Insumo</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Categoría</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase text-right">Stock Mínimo</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase text-right">Stock Actual</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase text-right">Histórico Consumido</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {supplies.map(s => {
                        const isCrit = s.currentStock < s.minStock;
                        const consumed = getSupplyTotalConsumed(s.id);
                        return (
                          <tr key={s.id}>
                            <td className="px-3 py-2 font-bold text-gray-800">{s.name}</td>
                            <td className="px-3 py-2 font-medium text-gray-600">{s.category || 'General'}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{s.minStock} {s.unit}</td>
                            <td className={`px-3 py-2 text-right font-black ${isCrit ? 'text-red-600' : 'text-[#4B7349]'}`}>
                              {s.currentStock} {s.unit}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-gray-700">{consumed} {s.unit}</td>
                            <td className="px-3 py-2 text-right font-black uppercase">
                              <span className={isCrit ? 'text-red-600' : 'text-[#4B7349]'}>
                                {isCrit ? 'BAJO MÍNIMO' : 'NORMAL'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <span>Ateneo CRM Técnico Suite v2.5</span>
                    <span>Documento Oficial de Inventario</span>
                  </div>
                </div>
              );
            }

            if (printingReport.type === 'supply') {
              const target = supplies.find(s => s.id === printingReport.selectedSupplyId);
              if (!target) return <p className="text-red-500">Error: Insumo no encontrado.</p>;

              const supplyDeductions = deductions.filter(d => d.supplyId === target.id);
              const totalConsumed = supplyDeductions.reduce((a, c) => a + c.quantity, 0);

              return (
                <div className="w-full flex flex-col gap-6">
                  <div className="border-b-4 border-[#4B7349] pb-4 flex justify-between items-end">
                    <div>
                      <h1 className="text-2xl font-black uppercase text-gray-800 tracking-tight">CRM Técnico - Reporte de Insumos</h1>
                      <p className="text-xs font-bold text-[#4B7349] uppercase tracking-wider">Histórico de Uso de Insumo Particular</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 font-bold uppercase">
                      <p>Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                      <p>ID: {target.id}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase block">Insumo</span>
                      <h2 className="text-xl font-black text-gray-800 uppercase">{target.name}</h2>
                      <span className="text-xs font-bold text-blue-600 uppercase">{target.category || 'General'}</span>
                    </div>

                    <div className="flex gap-6 text-right">
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase block">Stock Actual</span>
                        <span className="text-xl font-black text-gray-800">{target.currentStock} {target.unit}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase block">Total Egreso</span>
                        <span className="text-xl font-black text-amber-700">{totalConsumed} {target.unit}</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-black text-gray-700 uppercase mt-2">Detalle de Salidas y Descuentos Registrados:</h3>

                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300 text-left">
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Fecha</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Cantidad</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Destino (Obligatorio)</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Proyecto</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Registrado Por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {supplyDeductions.length > 0 ? (
                        supplyDeductions.map(d => (
                          <tr key={d.id}>
                            <td className="px-3 py-2 font-bold text-gray-800">{d.date}</td>
                            <td className="px-3 py-2 font-black text-amber-700">-{d.quantity} {target.unit}</td>
                            <td className="px-3 py-2 font-bold text-gray-700">{d.destination}</td>
                            <td className="px-3 py-2 text-gray-600">{d.project || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{d.registeredBy}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-400 italic">No hay salidas registradas para este insumo.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <span>Ateneo CRM Técnico Suite v2.5</span>
                    <span>Documento Oficial de Inventario</span>
                  </div>
                </div>
              );
            }

            if (printingReport.type === 'project') {
              const projName = printingReport.selectedProject;
              const projDeductions = deductions.filter(d => d.project === projName);

              return (
                <div className="w-full flex flex-col gap-6">
                  <div className="border-b-4 border-[#4B7349] pb-4 flex justify-between items-end">
                    <div>
                      <h1 className="text-2xl font-black uppercase text-gray-800 tracking-tight">CRM Técnico - Reporte de Insumos</h1>
                      <p className="text-xs font-bold text-[#4B7349] uppercase tracking-wider">Consumo de Insumos por Proyecto</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 font-bold uppercase">
                      <p>Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                      <p>Proyecto: {projName || 'Sin Especificar'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border">
                    <span className="text-[10px] font-black text-gray-400 uppercase block">Proyecto</span>
                    <h2 className="text-xl font-black text-gray-800 uppercase">{projName}</h2>
                  </div>

                  <table className="w-full border-collapse text-xs mt-2">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300 text-left">
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Fecha</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Insumo</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Cantidad</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Destino</th>
                        <th className="px-3 py-2 font-black text-gray-600 uppercase">Registrado Por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {projDeductions.map(d => (
                        <tr key={d.id}>
                          <td className="px-3 py-2 font-bold text-gray-800">{d.date}</td>
                          <td className="px-3 py-2 font-bold text-gray-800">{d.supplyName}</td>
                          <td className="px-3 py-2 font-black text-amber-700">-{d.quantity}</td>
                          <td className="px-3 py-2 font-bold text-gray-700">{d.destination}</td>
                          <td className="px-3 py-2 text-gray-500">{d.registeredBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <span>Ateneo CRM Técnico Suite v2.5</span>
                    <span>Documento Oficial de Inventario</span>
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

export default SuppliesView;
