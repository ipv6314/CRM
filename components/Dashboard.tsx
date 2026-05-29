
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DB } from '../services/db';
import { COLORS } from '../constants';

const Dashboard: React.FC = () => {
  const tickets = DB.getTickets();
  const equipment = DB.getEquipment();

  const effectors = useMemo(() => {
    const set = new Set(equipment.map(e => e.effector || 'Desconocido'));
    return Array.from(set).sort();
  }, [equipment]);

  const [activeEffector, setActiveEffector] = useState(effectors[0] || '');
  const [decommissionedEffector, setDecommissionedEffector] = useState(effectors[0] || '');

  const [showExportModal, setShowExportModal] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1); // Primero del mes actual
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [printingDashboardReport, setPrintingDashboardReport] = useState<any | null>(null);

  const parseTicketDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return new Date(dateStr);
  };

  const parseInputDate = (dateStr: string) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const getExportMetrics = () => {
    const dFrom = parseInputDate(dateFrom);
    const dTo = parseInputDate(dateTo);
    if (dFrom) dFrom.setHours(0, 0, 0, 0);
    if (dTo) dTo.setHours(23, 59, 59, 999);

    const filteredTickets = tickets.filter(t => {
      const tDate = parseTicketDate(t.date);
      if (dFrom && tDate < dFrom) return false;
      if (dTo && tDate > dTo) return false;
      return true;
    });

    const totalActivos = equipment.filter(e => !e.isDecommissioned).length;
    const totalIncidencias = filteredTickets.length;
    
    // total de incidencias con baja (type === 'Baja')
    const totalConBaja = filteredTickets.filter(t => t.type === 'Baja').length;

    // Incidencias de actualizacion (subType === 'Actualización')
    const totalActualizacion = filteredTickets.filter(t => t.subType === 'Actualización' || (t.type === 'Hardware' && t.subType === 'Actualización')).length;

    // incidencias de reparacion (subType === 'Reparación')
    const totalReparacion = filteredTickets.filter(t => t.subType === 'Reparación' || (t.type === 'Hardware' && t.subType === 'Reparación')).length;

    return {
      totalActivos,
      totalIncidencias,
      totalConBaja,
      totalActualizacion,
      totalReparacion,
      filteredTickets
    };
  };

  const decommissionedCount = useMemo(() => {
    return equipment.filter(e => e.isDecommissioned).length;
  }, [equipment]);

  const incidentTypesData = useMemo(() => {
    const counts = tickets.reduce((acc: any, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(type => ({
      name: type,
      value: counts[type]
    }));
  }, [tickets]);

  const activeEffectorData = useMemo(() => {
    const filtered = equipment.filter(e => !e.isDecommissioned && (e.effector || 'Desconocido') === activeEffector);
    const counts: Record<string, number> = {};
    filtered.forEach(e => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return Object.keys(counts).map(type => ({ name: type, value: counts[type] }));
  }, [equipment, activeEffector]);

  const decommissionedEffectorData = useMemo(() => {
    const filtered = equipment.filter(e => e.isDecommissioned && (e.effector || 'Desconocido') === decommissionedEffector);
    const counts: Record<string, number> = {};
    filtered.forEach(e => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return Object.keys(counts).map(type => ({ name: type, value: counts[type] }));
  }, [equipment, decommissionedEffector]);

  const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.grey, '#808080'];

  const handleExport = () => {
    setShowExportModal(true);
  };

  const triggerPrintDashboardReport = () => {
    const metrics = getExportMetrics();
    setPrintingDashboardReport(metrics);
    setShowExportModal(false);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-[#181411]">Resumen de Administración</h2>
          <p className="text-[#897161]">Estadísticas globales de soporte técnico e inventario</p>
        </div>
        <button 
          onClick={handleExport}
          className="bg-[#3D3D3D] text-white px-6 h-11 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition-all no-print"
        >
          <span className="material-symbols-outlined">picture_as_pdf</span>
          Exportar Reporte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Incidencias" value={tickets.length.toString()} icon="report_problem" color={COLORS.primary} trend="+12.5%" />
        <StatCard title="Incidencias con Bajas" value={decommissionedCount.toString()} icon="assignment_return" color={COLORS.error} trend="+2.1%" trendColor="text-orange-600" />
        <StatCard title="Equipos Registrados" value={equipment.length.toString()} icon="devices" color={COLORS.grey} trend="+5%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Activos por Efector */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-6 h-[450px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-bold">Equipos Activos por Tipo</h3>
            <select 
              className="text-xs font-bold border-gray-200 rounded-lg bg-gray-50 px-3 py-2 focus:ring-[#4B7349] no-print"
              value={activeEffector}
              onChange={(e) => setActiveEffector(e.target.value)}
            >
              {effectors.map(eff => <option key={eff} value={eff}>{eff}</option>)}
            </select>
          </div>
          
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeEffectorData.length ? activeEffectorData : [{ name: 'N/A', value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8f7f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="value" name="Cantidad" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel Bajas por Efector */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-6 h-[450px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-bold">Bajas por Tipo</h3>
            <select 
              className="text-xs font-bold border-gray-200 rounded-lg bg-gray-50 px-3 py-2 focus:ring-[#4B7349] no-print"
              value={decommissionedEffector}
              onChange={(e) => setDecommissionedEffector(e.target.value)}
            >
              {effectors.map(eff => <option key={eff} value={eff}>{eff}</option>)}
            </select>
          </div>
          
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={decommissionedEffectorData.length ? decommissionedEffectorData : [{ name: 'N/A', value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8f7f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="value" name="Cantidad" fill={COLORS.grey} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Torta: Tipos de Incidencias */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 h-[450px] lg:col-span-2">
          <h3 className="text-lg font-bold">Tipos de Incidencias</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={incidentTypesData.length ? incidentTypesData : [{ name: 'Sin datos', value: 1 }]}
                innerRadius={70}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {incidentTypesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
                {!incidentTypesData.length && <Cell fill="#f3f4f6" />}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 no-print font-sans">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 bg-[#3D3D3D] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">picture_as_pdf</span>
                <h3 className="font-black uppercase tracking-widest text-sm">Exportar Reporte Ejecutivo</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="material-symbols-outlined hover:rotate-90 transition-transform">close</button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase text-gray-400">Rango de Fechas Seleccionadas</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-405">Desde</label>
                    <input
                      type="date"
                      className="border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#4B7349]"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-405">Hasta</label>
                    <input
                      type="date"
                      className="border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#4B7349]"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview of metrics to be printed */}
              {(() => {
                const metrics = getExportMetrics();
                return (
                  <div className="bg-gray-50 border p-4 rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Métricas a Exportar</span>
                    <div className="flex justify-between text-xs font-medium border-b py-1">
                      <span className="text-gray-600 font-bold">Total de Activos:</span>
                      <span className="font-black text-gray-800">{metrics.totalActivos}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium border-b py-1">
                      <span className="text-gray-600 font-bold">Total Incidencias en Período:</span>
                      <span className="font-black text-gray-800">{metrics.totalIncidencias}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium border-b py-1">
                      <span className="text-gray-600 font-bold">Total Incidencias con Baja:</span>
                      <span className="font-black text-gray-800">{metrics.totalConBaja}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium border-b py-1">
                      <span className="text-gray-600 font-bold">Incidencias de Actualización:</span>
                      <span className="font-black text-gray-800">{metrics.totalActualizacion}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium py-1">
                      <span className="text-gray-600 font-bold">Incidencias de Reparación:</span>
                      <span className="font-black text-gray-800">{metrics.totalReparacion}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={triggerPrintDashboardReport}
                className="px-5 py-2 bg-[#181411] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-black uppercase"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                Generar Reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {printingDashboardReport && (
        <div id="print-section" className="hidden bg-white p-8 text-black font-sans min-h-[1050px] flex-col w-full text-left">
          <div className="border-b-4 border-[#3D3D3D] pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black uppercase text-gray-800 tracking-tight">CRM Técnico - Reporte Ejecutivo</h1>
              <p className="text-xs font-bold text-[#4B7349] uppercase tracking-wider">Estadísticas de Gestión y Rendimiento</p>
            </div>
            <div className="text-right text-xs text-gray-400 font-bold uppercase">
              <p>Fecha Generación: {new Date().toLocaleDateString('es-AR')}</p>
              <p>Rango: {dateFrom ? new Date(dateFrom).toLocaleDateString('es-AR') : 'Inicio'} - {dateTo ? new Date(dateTo).toLocaleDateString('es-AR') : 'Hoy'}</p>
            </div>
          </div>

          <div className="my-6">
            <h2 className="text-base font-black text-gray-700 uppercase tracking-wide mb-1">Métricas Clave del Período Seleccionado</h2>
            <p className="text-xs text-gray-500">Este reporte resume de manera precisa el inventario consolidado y el volumen histórico de incidencias clasificadas entre las fechas seleccionadas.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="border p-4 rounded-xl bg-gray-50/50">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total de Activos</span>
              <span className="text-3xl font-black text-[#181411]">{printingDashboardReport.totalActivos}</span>
              <p className="text-[9px] text-gray-450 mt-1">Suma total de equipamiento tecnológico activo en circulación.</p>
            </div>
            <div className="border p-4 rounded-xl bg-gray-50/50">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Incidencias en Período</span>
              <span className="text-3xl font-black text-[#181411]">{printingDashboardReport.totalIncidencias}</span>
              <p className="text-[9px] text-gray-450 mt-1">Total de tickets de soporte creados en el rango seleccionado.</p>
            </div>
            <div className="border p-4 rounded-xl bg-gray-50/50">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Incidencias con Baja Técnica</span>
              <span className="text-3xl font-black text-red-700">{printingDashboardReport.totalConBaja}</span>
              <p className="text-[9px] text-gray-450 mt-1">Equipos retirados de circulación con veredicto certificado.</p>
            </div>
            <div className="border p-4 rounded-xl bg-gray-50/50">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Incidencias de Actualización</span>
              <span className="text-3xl font-black text-blue-700">{printingDashboardReport.totalActualizacion}</span>
              <p className="text-[9px] text-gray-450 mt-1">Mejoras de Hardware asignadas para optimizar rendimiento.</p>
            </div>
            <div className="border p-4 rounded-xl bg-gray-50/50 col-span-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Incidencias de Reparación</span>
              <span className="text-3xl font-black text-[#4B7349]">{printingDashboardReport.totalReparacion}</span>
              <p className="text-[9px] text-gray-450 mt-1">Intervenciones correctivas físicas en equipamiento dañado.</p>
            </div>
          </div>

          {printingDashboardReport.filteredTickets && printingDashboardReport.filteredTickets.length > 0 && (
            <div className="flex flex-col gap-3 mt-6">
              <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider">Detalle del Registro de Incidencias en Rango:</h3>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300 text-left">
                    <th className="px-3 py-2 font-black text-gray-600 uppercase">Fecha</th>
                    <th className="px-3 py-2 font-black text-gray-600 uppercase">ID Equipo</th>
                    <th className="px-3 py-2 font-black text-gray-600 uppercase">Técnico</th>
                    <th className="px-3 py-2 font-black text-gray-600 uppercase">Tipo / Tarea</th>
                    <th className="px-3 py-2 font-black text-gray-600 uppercase">Subtarea</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {printingDashboardReport.filteredTickets.map((t: any) => (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-gray-800 font-bold">{t.date}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{t.equipmentId}</td>
                      <td className="px-3 py-2 text-gray-700">{t.technician}</td>
                      <td className="px-3 py-2 font-bold uppercase">{t.type}</td>
                      <td className="px-3 py-2 text-gray-500">{t.subType || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 border-t border-gray-100 flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
            <span>Ateneo CRM Técnico v2.5 Suite</span>
            <span>Documento Oficial de Auditoría</span>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color, trend, trendColor = 'text-green-600' }: any) => (
  <div className="flex flex-col gap-2 rounded-xl p-6 bg-white border border-gray-200 shadow-sm">
    <div className="flex justify-between items-start">
      <p className="text-[#897161] text-sm font-medium">{title}</p>
      <span className="material-symbols-outlined" style={{ color }}>{icon}</span>
    </div>
    <p className="text-[#181411] tracking-tight text-3xl font-bold">{value}</p>
    <div className={`flex items-center gap-1 ${trendColor} text-sm font-bold`}>
      <span className="material-symbols-outlined text-sm">trending_up</span>
      <span>{trend}</span>
      <span className="text-gray-400 font-normal ml-1">periodo actual</span>
    </div>
  </div>
);

export default Dashboard;
