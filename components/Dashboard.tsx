
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
    window.print();
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
