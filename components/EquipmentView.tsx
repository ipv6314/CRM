
import React, { useState, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { DB } from '../services/db';
import { Equipment, EquipmentLog } from '../types';
import { COLORS } from '../constants';

const EquipmentView: React.FC = () => {
  const [items, setItems] = useState<Equipment[]>(DB.getEquipment());
  const [logs, setLogs] = useState<EquipmentLog[]>(DB.getEquipmentLogs());
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [printingItem, setPrintingItem] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = DB.getCurrentSession();
  const isAdmin = currentUser?.role === 'admin';

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const invId = (i.inventoryId && String(i.inventoryId) !== 'NaN') ? String(i.inventoryId) : '';
      return (
        invId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.brand.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }).sort((a, b) => (a.isDecommissioned ? 1 : 0) - (b.isDecommissioned ? 1 : 0));
  }, [items, searchTerm]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const now = new Date().toISOString().split('T')[0];
    const itemToSave = { 
      ...editing, 
      id: editing.id || Math.random().toString(36).substr(2, 9),
      createdAt: editing.createdAt || now,
      updatedAt: now 
    };
    DB.saveEquipment(itemToSave);
    setItems(DB.getEquipment());
    setLogs(DB.getEquipmentLogs());
    setEditing(null);
  };

  const handleRevert = (id: string) => {
    if (confirm('¿Está seguro de que desea revertir la baja de este equipo? Pasará a estado ACTIVO nuevamente.')) {
      DB.revertEquipmentDecommission(id);
      setItems(DB.getEquipment());
      setLogs(DB.getEquipmentLogs());
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = values[i];
      });
      return obj;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = parseCSV(text);

        const now = new Date().toISOString().split('T')[0];
        let count = 0;

        json.forEach((row) => {
          const getVal = (keys: string[]) => {
            const foundKey = Object.keys(row).find(k => keys.includes(k.toLowerCase()) || keys.includes(k));
            const val = foundKey ? row[foundKey] : '';
            return (val && val.trim() !== '' && String(val) !== 'NaN') ? val.toString() : 'N/A';
          };

          const invIdFromCsv = getVal(['inventoryid', 'inventario', 'id']);
          const finalInvId = invIdFromCsv === 'N/A' ? '' : invIdFromCsv.replace(/[.,\s]/g, '');

          const newEquip: Equipment = {
            id: Math.random().toString(36).substr(2, 9),
            inventoryId: finalInvId,
            effector: getVal(['effector', 'efector']),
            service: getVal(['service', 'servicio']),
            area: getVal(['area']),
            consultorio: getVal(['consultorio', 'puesto', 'box']),
            name: getVal(['name', 'nombre', 'equipo']),
            brand: getVal(['brand', 'marca']),
            model: getVal(['model', 'modelo']),
            type: getVal(['type', 'tipo']),
            os: getVal(['os', 'so', 'sistemaoperativo']),
            cpu: getVal(['cpu', 'procesador']),
            speed: getVal(['speed', 'velocidad']),
            ramModule: getVal(['rammodule', 'modulo']),
            ramGeneration: getVal(['ramgeneration', 'generacion']),
            ramCapacity: getVal(['ramcapacity', 'ram', 'capacidadram']),
            storageType: getVal(['storagetype', 'tipoalmacenamiento']),
            storageCapacity: getVal(['storagecapacity', 'capacidad']),
            macLan: getVal(['maclan', 'mac']),
            macWireless: getVal(['macwireless', 'macw']),
            serialNumber: getVal(['serialnumber', 'serie', 'nserie', 'serial']),
            comments: getVal(['comments', 'comentarios']),
            createdAt: now,
            updatedAt: now
          };
          
          DB.saveEquipment(newEquip);
          count++;
        });

        setItems(DB.getEquipment());
        setLogs(DB.getEquipmentLogs());
        alert(`Se han importado ${count} equipos correctamente desde el CSV.`);
      } catch (error) {
        console.error("Error al procesar el archivo CSV:", error);
        alert("Error al procesar el archivo. Asegúrese de que sea un CSV válido.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const triggerPrint = (item: Equipment) => {
    setPrintingItem(item);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getQRValue = (item: Equipment) => {
    const invId = (item.inventoryId && String(item.inventoryId) !== 'NaN' && String(item.inventoryId).trim() !== '') ? item.inventoryId : 'SIN INVENTARIO';
    return `FICHA TÉCNICA
-------------------
ID: ${invId}
STATUS: ${item.isDecommissioned ? 'DE BAJA' : 'ACTIVO'}
EQUIPO: ${item.name}
MARCA/MOD: ${item.brand} ${item.model}
SN: ${item.serialNumber || 'N/A'}
CPU: ${item.cpu} (${item.speed})
RAM: ${item.ramCapacity} ${item.ramGeneration} (${item.ramModule})
DISCO: ${item.storageCapacity} (${item.storageType})
OS: ${item.os}
MAC LAN: ${item.macLan || 'N/A'}
MAC WIFI: ${item.macWireless || 'N/A'}
UBICACIÓN: ${item.service} - ${item.area}${item.consultorio ? ` - ${item.consultorio}` : ''}
EFECTOR: ${item.effector}
ACTUALIZADO: ${item.updatedAt || item.createdAt}`;
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleDeleteBulk = () => {
    if (!isAdmin) return;
    if (confirm(`¿Está seguro de que desea eliminar definitivamente los ${selectedIds.size} equipos seleccionados?`)) {
      selectedIds.forEach(id => {
        DB.deleteEquipment(id);
      });
      setItems(DB.getEquipment());
      setLogs(DB.getEquipmentLogs());
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-[#181411]">Gestión de Equipos</h2>
          <p className="text-[#897161]">Administre el inventario técnico y etiquetas QR</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteBulk}
              className="flex items-center gap-2 px-6 h-11 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg animate-in zoom-in-95"
            >
              <span className="material-symbols-outlined">delete_sweep</span>
              Eliminar ({selectedIds.size})
            </button>
          )}
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 px-6 h-11 rounded-lg border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined">{showLogs ? 'list_alt' : 'history'}</span>
            {showLogs ? 'Ver Inventario' : 'Historial de Logs'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-6 h-11 rounded-lg border-2 border-[#4B7349] text-[#4B7349] font-bold hover:bg-[#4B7349]/5 transition-colors"
          >
            <span className="material-symbols-outlined">upload_file</span>
            {isImporting ? 'Cargando...' : 'Importar (CSV)'}
          </button>
          <button 
            onClick={() => setEditing({ 
              id: '', inventoryId: '', effector: '', service: '', area: '', consultorio: '', name: '', 
              brand: '', model: '', type: '', os: '', cpu: '', speed: '', ramModule: 'DIMM', 
              ramGeneration: 'DDR4', ramCapacity: '', storageType: 'SSD', storageCapacity: '', 
              macLan: '', macWireless: '', comments: '', 
              createdAt: '', updatedAt: '', serialNumber: '' 
            })}
            className="flex items-center gap-2 px-6 h-11 rounded-lg bg-[#4B7349] text-white font-bold hover:bg-[#457330] transition-colors shadow-lg"
          >
            <span className="material-symbols-outlined">add</span>
            Nuevo Equipo
          </button>
        </div>
      </div>

      {!showLogs ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center bg-gray-50">
            <span className="material-symbols-outlined text-gray-400 mr-2">search</span>
            <input 
              type="text" 
              placeholder="Buscar por ID, Nombre o Marca..." 
              className="border-none bg-transparent focus:ring-0 text-sm flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-[#4B7349] focus:ring-[#4B7349]"
                      checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4">Inventario</th>
                  <th className="px-6 py-4">Nombre / Marca</th>
                  <th className="px-6 py-4">N° de Serie</th>
                  <th className="px-6 py-4">Servicio / Área</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map(item => {
                  const invValue = String(item.inventoryId);
                  const safeInvId = (item.inventoryId && invValue !== 'NaN' && invValue.trim() !== '') ? item.inventoryId : null;
                  return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 group transition-colors ${item.isDecommissioned ? 'bg-red-50/30' : ''} ${selectedIds.has(item.id) ? 'bg-[#4B7349]/5' : ''}`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-[#4B7349] focus:ring-[#4B7349]"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {safeInvId ? (
                        safeInvId
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-tight border border-orange-200 whitespace-nowrap">
                          <span className="material-symbols-outlined !text-[12px]">warning</span>
                          ACTUALIZAR INVENTARIO
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-xs text-gray-400">{item.brand} {item.model}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.serialNumber || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {item.service} <br/> 
                      <span className="text-xs">{item.area}</span>
                    </td>
                    <td className="px-6 py-4">
                      {item.isDecommissioned ? (
                        <span className="px-2 py-1 rounded bg-black text-white text-[10px] font-black uppercase tracking-widest">DE BAJA</span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-green-100 text-[#4B7349] text-[10px] font-black uppercase tracking-widest border border-green-200">ACTIVO</span>
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!item.isDecommissioned ? (
                          <button onClick={() => setEditing(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                        ) : (
                          isAdmin && (
                            <button 
                              onClick={() => handleRevert(item.id)} 
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Revertir Baja"
                            >
                              <span className="material-symbols-outlined">history</span>
                            </button>
                          )
                        )}
                        <button 
                          onClick={() => triggerPrint(item)} 
                          className="p-2 text-[#4B7349] hover:bg-green-50 rounded-lg"
                          title="Imprimir Etiqueta"
                        >
                          <span className="material-symbols-outlined">print</span>
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`¿Eliminar definitivamente el equipo ${safeInvId || item.name} de la base de datos?`)) {
                              DB.deleteEquipment(item.id);
                              setItems(DB.getEquipment());
                              setLogs(DB.getEquipmentLogs());
                            }
                          }} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                      No se encontraron equipos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
            <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Logs de Auditoría de Equipos</span>
            <span className="text-[10px] font-bold text-[#4B7349] uppercase">Historial de Operaciones</span>
          </div>
          <div className="flex flex-col divide-y divide-gray-100 max-h-[600px] overflow-y-auto no-scrollbar">
            {logs.length > 0 ? logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4">
                <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                  log.action === 'CREATE' ? 'bg-green-100 text-[#4B7349]' :
                  log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                  log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                  log.action === 'REVERT_DECOMMISSION' ? 'bg-orange-100 text-orange-700' :
                  'bg-black text-white'
                }`}>
                  <span className="material-symbols-outlined text-lg">
                    {log.action === 'CREATE' ? 'add' : 
                     log.action === 'UPDATE' ? 'sync' : 
                     log.action === 'DELETE' ? 'delete' : 
                     log.action === 'REVERT_DECOMMISSION' ? 'history' : 'report'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#3D3D3D]">{log.details}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Por: {log.userName} • {log.timestamp}</p>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-1 bg-gray-100 rounded text-gray-500 border border-gray-200">{log.action}</span>
              </div>
            )) : (
              <div className="p-20 text-center flex flex-col items-center gap-4 opacity-20">
                <span className="material-symbols-outlined text-5xl">history_edu</span>
                <p className="text-xs font-black uppercase tracking-widest">Sin registros de actividad</p>
              </div>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-[#3D3D3D] text-white">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">settings_suggest</span>
                <h3 className="text-xl font-bold uppercase tracking-tight">{editing.id ? 'Editar Equipo Técnico' : 'Registro de Nuevo Equipo'}</h3>
              </div>
              <button onClick={() => setEditing(null)} className="material-symbols-outlined hover:rotate-90 transition-transform">close</button>
            </div>
            <form onSubmit={handleSave} className="p-8 overflow-y-auto no-scrollbar flex flex-col gap-8">
              
              {/* Sección QR y Datos Identificatorios */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="md:col-span-3 flex flex-col items-center gap-4">
                   <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <QRCodeSVG 
                      value={getQRValue(editing)} 
                      size={160}
                      level="Q"
                      marginSize={2}
                    />
                   </div>
                   <div className="text-center">
                    <span className="text-[10px] font-black text-[#4B7349] uppercase tracking-widest">Etiqueta QR Dinámica</span>
                    <p className="text-[9px] text-gray-400 uppercase">Se actualiza al instante</p>
                   </div>
                </div>
                
                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                   <Input 
                    label="ID Inventario" 
                    value={editing.inventoryId} 
                    onChange={(v: string) => setEditing({...editing, inventoryId: (v || '').replace(/[.,\s]/g, '')})} 
                    placeholder="Opcional - Sin decimales" 
                  />
                  <Input label="Nombre Identificador" value={editing.name} onChange={(v: string) => setEditing({...editing, name: v})} required placeholder="Ej: PC Recepción 01" />
                  <Input label="Marca" value={editing.brand} onChange={(v: string) => setEditing({...editing, brand: v})} required />
                  <Input label="Modelo" value={editing.model} onChange={(v: string) => setEditing({...editing, model: v})} required />
                  <Input label="N° de Serie" value={editing.serialNumber || ''} onChange={(v: string) => setEditing({...editing, serialNumber: v})} placeholder="Opcional" />
                  <Input label="Tipo de Equipo" value={editing.type} onChange={(v: string) => setEditing({...editing, type: v})} required placeholder="Ej: All-in-One, Desktop, Laptop" />
                </div>
              </div>

              {/* Sección Ubicación */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <span className="material-symbols-outlined text-[#4B7349]">location_on</span>
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">Ubicación y Despliegue</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input label="Efector / Hospital" value={editing.effector} onChange={(v: string) => setEditing({...editing, effector: v})} required />
                  <Input label="Área" value={editing.area} onChange={(v: string) => setEditing({...editing, area: v})} required />
                  <Input label="Servicio" value={editing.service} onChange={(v: string) => setEditing({...editing, service: v})} required />
                  <Input label="Consultorio / Puesto" value={editing.consultorio || ''} onChange={(v: string) => setEditing({...editing, consultorio: v})} placeholder="Opcional" />
                </div>
              </div>

              {/* Sección Hardware */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <span className="material-symbols-outlined text-[#4B7349]">memory</span>
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">Especificaciones Técnicas de Hardware</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input label="Procesador (CPU)" value={editing.cpu} onChange={(v: string) => setEditing({...editing, cpu: v})} required />
                  <Input label="Velocidad CPU" value={editing.speed} onChange={(v: string) => setEditing({...editing, speed: v})} required />
                  <Input label="Sistema Operativo" value={editing.os} onChange={(v: string) => setEditing({...editing, os: v})} required />
                  
                  <Select 
                    label="Módulo RAM" 
                    value={editing.ramModule} 
                    options={['DIMM', 'SODIMM']} 
                    onChange={(v: string) => setEditing({...editing, ramModule: v})} 
                  />
                  <Select 
                    label="Generación RAM" 
                    value={editing.ramGeneration} 
                    options={['DDR2', 'DDR3', 'DDR4', 'DDR5']} 
                    onChange={(v: string) => setEditing({...editing, ramGeneration: v})} 
                  />
                  <Input label="Capacidad RAM" value={editing.ramCapacity} onChange={(v: string) => setEditing({...editing, ramCapacity: v})} required placeholder="Ej: 8GB, 16GB" />
                  
                  <Select 
                    label="Tipo Almacenamiento" 
                    value={editing.storageType} 
                    options={['HDD', 'SSD']} 
                    onChange={(v: string) => setEditing({...editing, storageType: v})} 
                  />
                  <Input label="Capacidad Almacenamiento" value={editing.storageCapacity} onChange={(v: string) => setEditing({...editing, storageCapacity: v})} required placeholder="Ej: 240GB, 1TB" />
                </div>
              </div>

              {/* Sección Red y Otros */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <span className="material-symbols-outlined text-[#4B7349]">lan</span>
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">Conectividad y Comentarios</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input label="Dirección MAC LAN" value={editing.macLan || ''} onChange={(v: string) => setEditing({...editing, macLan: v})} placeholder="XX:XX:XX:XX:XX:XX (Opcional)" />
                  <Input label="Dirección MAC Wireless" value={editing.macWireless || ''} onChange={(v: string) => setEditing({...editing, macWireless: v})} placeholder="XX:XX:XX:XX:XX:XX (Opcional)" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Comentarios Adicionales</label>
                  <textarea 
                    className="w-full rounded-xl border-gray-200 focus:ring-[#4B7349] focus:border-[#4B7349] text-sm p-4 bg-gray-50/50" 
                    rows={4} 
                    placeholder="Detalles sobre el estado físico, garantías o historial breve..."
                    value={editing.comments}
                    onChange={e => setEditing({...editing, comments: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button type="button" onClick={() => setEditing(null)} className="px-8 py-3 border-2 border-gray-100 rounded-xl font-bold text-gray-400 hover:bg-gray-50 transition-all uppercase text-xs tracking-widest">Cancelar</button>
                <button type="submit" className="px-10 py-3 bg-[#4B7349] text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-green-100 hover:bg-[#457330] transition-all">Guardar Ficha Técnica</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printingItem && (
        <div id="print-section" className="hidden flex-col items-center justify-center bg-white p-10 font-sans text-black">
          <div className={`border-4 border-black p-6 rounded-3xl flex flex-col items-center gap-6 max-w-[400px] ${printingItem.isDecommissioned ? 'bg-red-50' : ''}`}>
            <div className={`text-white px-4 py-1 rounded-full mb-2 ${printingItem.isDecommissioned ? 'bg-red-700' : 'bg-black'}`}>
               <span className="text-[10px] font-black tracking-widest uppercase">{printingItem.isDecommissioned ? 'EQUIPO DADO DE BAJA' : 'Propiedad Técnica CRM'}</span>
            </div>
            
            <QRCodeSVG 
              value={getQRValue(printingItem)} 
              size={200} 
              level="H" 
              marginSize={1}
            />

            <div className="w-full flex flex-col items-center gap-2">
              <Barcode 
                value={(printingItem.inventoryId && String(printingItem.inventoryId) !== 'NaN' && String(printingItem.inventoryId).trim() !== '') ? String(printingItem.inventoryId) : '0000'} 
                width={1.5}
                height={50}
                fontSize={12}
                background="transparent"
              />
            </div>
            
            <div className="text-center w-full">
              <p className="text-4xl font-black tracking-tighter mb-1">{(printingItem.inventoryId && String(printingItem.inventoryId) !== 'NaN' && String(printingItem.inventoryId).trim() !== '') ? printingItem.inventoryId : 'SIN INVENTARIO'}</p>
              <p className="text-lg font-bold uppercase border-t border-black pt-2">{printingItem.name}</p>
              <div className="flex flex-col gap-1 mt-2">
                <p className="text-xs font-bold text-gray-600">S/N: {printingItem.serialNumber || 'N/A'}</p>
                <p className="text-sm font-medium text-gray-600">
                  {printingItem.service} — {printingItem.area}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center border-t border-dotted border-gray-400 pt-4 w-full">
               <p className="text-[9px] font-bold text-gray-500 uppercase">Escanee para Ficha Técnica Completa</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Input = ({ label, value, onChange, required, pattern, placeholder }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight ml-1">{label}</label>
    <input 
      type="text" 
      required={required}
      pattern={pattern}
      placeholder={placeholder}
      className="h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349]/20 focus:border-[#4B7349] text-sm transition-all"
      value={(value === 'N/A' || String(value) === 'NaN') ? '' : value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const Select = ({ label, value, options, onChange }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight ml-1">{label}</label>
    <select 
      className="h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:ring-2 focus:ring-[#4B7349]/20 focus:border-[#4B7349] text-sm transition-all font-bold"
      value={(value === 'N/A' || String(value) === 'NaN') ? options[0] : value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

export default EquipmentView;
