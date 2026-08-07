
import { Equipment, EquipmentLog, SparePart, SparePartLog, SupportTicket, Supply, SupplyDeduction, SupplyLog, User } from '../types';

const STORAGE_KEYS = {
  EQUIPMENT: 'crm_equipment',
  EQUIPMENT_LOGS: 'crm_equipment_logs',
  SPARE_PARTS: 'crm_spare_parts',
  SPARE_PARTS_LOGS: 'crm_spare_parts_logs',
  SUPPLIES: 'crm_supplies',
  SUPPLY_DEDUCTIONS: 'crm_supply_deductions',
  SUPPLY_LOGS: 'crm_supply_logs',
  TICKETS: 'crm_tickets',
  USERS: 'crm_users',
  SESSION: 'crm_session'
};

const getInitialData = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  try {
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveData = <T,>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initial Mocks
const mockUsers: User[] = [
  { id: '1', username: 'admin', password: 'admin', name: 'Administrador', role: 'admin', email: 'admin@techcrm.com', legajo: '0000' }
];

const mockParts: SparePart[] = [
  { id: 'p1', name: 'Baterías', currentStock: 85, minStock: 20, isSerialized: false },
  { id: 'p2', name: 'Pantallas', currentStock: 2, minStock: 15, isSerialized: true, serials: ['SN-PAN-001', 'SN-PAN-002'] }
];

const mockSupplies: Supply[] = [
  { id: 's1', name: 'Toner HP 85A (CE285A)', category: 'Impresión', unit: 'Unidades', currentStock: 14, minStock: 5 },
  { id: 's2', name: 'Resmas Papel A4 75g', category: 'Papelería', unit: 'Resmas', currentStock: 3, minStock: 10 },
  { id: 's3', name: 'Cable de Red UTP Cat6', category: 'Conectividad', unit: 'Metros', currentStock: 180, minStock: 50 },
  { id: 's4', name: 'Conectores RJ45 Cat6', category: 'Conectividad', unit: 'Unidades', currentStock: 15, minStock: 50 },
  { id: 's5', name: 'Alcohol Isopropílico 1L', category: 'Limpieza', unit: 'Litros', currentStock: 8, minStock: 3 },
  { id: 's6', name: 'Cinta de Embalaje Transparente 48mm', category: 'Oficina', unit: 'Rollos', currentStock: 22, minStock: 10 }
];

const mockSupplyDeductions: SupplyDeduction[] = [
  { 
    id: 'd1', 
    supplyId: 's1', 
    supplyName: 'Toner HP 85A (CE285A)', 
    category: 'Impresión', 
    date: '05/08/2026', 
    destination: 'Oficina de Registros', 
    project: 'Mantenimiento General', 
    quantity: 1, 
    registeredBy: 'Administrador', 
    notes: 'Cambio de tóner agotado en la impresora principal',
    timestamp: '05/08/2026 10:30' 
  },
  { 
    id: 'd2', 
    supplyId: 's2', 
    supplyName: 'Resmas Papel A4 75g', 
    category: 'Papelería', 
    date: '06/08/2026', 
    destination: 'Consultorio 3 - Admisión', 
    project: 'Campaña de Salud 2026', 
    quantity: 5, 
    registeredBy: 'Administrador', 
    notes: 'Insumo de papel para fichas de pacientes',
    timestamp: '06/08/2026 14:15' 
  }
];

export const DB = {
  getUsers: () => {
    const list = getInitialData<User[]>(STORAGE_KEYS.USERS, mockUsers);
    const adminIndex = list.findIndex(u => u.username === 'admin');
    if (adminIndex === -1) {
      list.push({ id: '1', username: 'admin', password: 'admin', name: 'Administrador', role: 'admin', email: 'admin@techcrm.com', legajo: '0000' });
      saveData(STORAGE_KEYS.USERS, list);
    } else {
      const adminUser = list[adminIndex];
      if (adminUser.password !== 'admin' || adminUser.role !== 'admin') {
        adminUser.password = 'admin';
        adminUser.role = 'admin';
        saveData(STORAGE_KEYS.USERS, list);
      }
    }
    return list;
  },
  saveUser: (user: User) => {
    const users = DB.getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex > -1) users[existingIndex] = user;
    else users.push(user);
    saveData(STORAGE_KEYS.USERS, users);
  },
  deleteUser: (id: string) => {
    const users = DB.getUsers().filter(u => u.id !== id);
    saveData(STORAGE_KEYS.USERS, users);
  },

  getSpareParts: () => getInitialData(STORAGE_KEYS.SPARE_PARTS, mockParts),
  getSparePartLogs: () => getInitialData(STORAGE_KEYS.SPARE_PARTS_LOGS, [] as SparePartLog[]),
  
  getSupplies: () => getInitialData(STORAGE_KEYS.SUPPLIES, mockSupplies),
  getSupplyDeductions: () => getInitialData(STORAGE_KEYS.SUPPLY_DEDUCTIONS, mockSupplyDeductions),
  getSupplyLogs: () => getInitialData(STORAGE_KEYS.SUPPLY_LOGS, [] as SupplyLog[]),

  logSupplyAction: (action: SupplyLog['action'], details: string) => {
    const session = DB.getCurrentSession();
    if (!session) return;
    const logs = DB.getSupplyLogs();
    logs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString(),
      userId: session.id,
      userName: session.name,
      action,
      details
    });
    saveData(STORAGE_KEYS.SUPPLY_LOGS, logs.slice(0, 100));
  },

  saveSupply: (supply: Supply, isUpdate = false) => {
    const supplies = DB.getSupplies();
    const existingIndex = supplies.findIndex(s => s.id === supply.id);
    const actionType = isUpdate ? 'UPDATE' : 'CREATE';
    const details = isUpdate ? `Actualización de insumo: ${supply.name}` : `Creación de insumo: ${supply.name}`;
    
    if (existingIndex > -1) supplies[existingIndex] = supply;
    else supplies.push(supply);
    
    saveData(STORAGE_KEYS.SUPPLIES, supplies);
    DB.logSupplyAction(actionType, details);
  },

  deleteSupply: (id: string) => {
    const supplies = DB.getSupplies();
    const supply = supplies.find(s => s.id === id);
    if (!supply) return;
    const filtered = supplies.filter(s => s.id !== id);
    saveData(STORAGE_KEYS.SUPPLIES, filtered);
    DB.logSupplyAction('DELETE', `Insumo eliminado: ${supply.name}`);
  },

  deductSupplyStock: (deduction: SupplyDeduction) => {
    const supplies = DB.getSupplies();
    const supply = supplies.find(s => s.id === deduction.supplyId);
    if (supply) {
      const oldStock = supply.currentStock;
      supply.currentStock = Math.max(0, supply.currentStock - deduction.quantity);
      saveData(STORAGE_KEYS.SUPPLIES, supplies);

      const deductions = DB.getSupplyDeductions();
      deductions.unshift(deduction);
      saveData(STORAGE_KEYS.SUPPLY_DEDUCTIONS, deductions);

      DB.logSupplyAction(
        'DEDUCT',
        `Descuento de ${deduction.quantity} ${supply.unit || 'unidades'} de "${supply.name}" (Stock: ${oldStock} -> ${supply.currentStock}). Destino: ${deduction.destination}${deduction.project ? `, Proyecto: ${deduction.project}` : ''}`
      );
    }
  },

  deleteSupplyDeduction: (id: string) => {
    const deductions = DB.getSupplyDeductions();
    const deduction = deductions.find(d => d.id === id);
    if (!deduction) return;
    const filtered = deductions.filter(d => d.id !== id);
    saveData(STORAGE_KEYS.SUPPLY_DEDUCTIONS, filtered);
    DB.logSupplyAction('DELETE', `Registro de descuento eliminado para: ${deduction.supplyName} (${deduction.quantity} ud.)`);
  },
  
  logSparePartAction: (action: SparePartLog['action'], details: string) => {
    const session = DB.getCurrentSession();
    if (!session) return;
    const logs = DB.getSparePartLogs();
    logs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString(),
      userId: session.id,
      userName: session.name,
      action,
      details
    });
    saveData(STORAGE_KEYS.SPARE_PARTS_LOGS, logs.slice(0, 100));
  },

  getEquipmentLogs: () => getInitialData(STORAGE_KEYS.EQUIPMENT_LOGS, [] as EquipmentLog[]),
  logEquipmentAction: (action: EquipmentLog['action'], details: string) => {
    const session = DB.getCurrentSession();
    if (!session) return;
    const logs = DB.getEquipmentLogs();
    logs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString(),
      userId: session.id,
      userName: session.name,
      action,
      details
    });
    saveData(STORAGE_KEYS.EQUIPMENT_LOGS, logs.slice(0, 100));
  },

  saveSparePart: (part: SparePart, isUpdate = false) => {
    const parts = DB.getSpareParts();
    const existingIndex = parts.findIndex(p => p.id === part.id);
    const actionType = isUpdate ? 'UPDATE' : 'CREATE';
    const details = isUpdate ? `Actualización de: ${part.name}` : `Creación de: ${part.name}`;
    
    if (existingIndex > -1) parts[existingIndex] = part;
    else parts.push(part);
    
    saveData(STORAGE_KEYS.SPARE_PARTS, parts);
    DB.logSparePartAction(actionType, details);
  },
  
  deleteSparePart: (id: string) => {
    const parts = DB.getSpareParts();
    const part = parts.find(p => p.id === id);
    if (!part) return;
    const filtered = parts.filter(p => p.id !== id);
    saveData(STORAGE_KEYS.SPARE_PARTS, filtered);
    DB.logSparePartAction('DELETE', `Eliminado: ${part.name}`);
  },

  updateStock: (id: string, quantity: number, serial?: string) => {
    const parts = DB.getSpareParts();
    const part = parts.find(p => p.id === id);
    if (part) {
      const oldStock = part.currentStock;
      if (part.isSerialized && serial && part.serials) {
        part.serials = part.serials.filter(s => s !== serial);
        part.currentStock = part.serials.length;
      } else {
        part.currentStock -= quantity;
      }
      saveData(STORAGE_KEYS.SPARE_PARTS, parts);
      DB.logSparePartAction('STOCK_ADJUST', `Stock ${part.name}: ${oldStock} -> ${part.currentStock}${serial ? ` (Serial: ${serial})` : ''}`);
    }
  },

  getEquipment: () => getInitialData(STORAGE_KEYS.EQUIPMENT, []),
  saveEquipment: (equip: Equipment) => {
    const items = DB.getEquipment();
    const existingIndex = items.findIndex(i => i.id === equip.id);
    const isUpdate = existingIndex > -1;
    
    if (isUpdate) items[existingIndex] = equip;
    else items.push(equip);
    
    saveData(STORAGE_KEYS.EQUIPMENT, items);
    const invId = (equip.inventoryId && equip.inventoryId !== 'NaN') ? equip.inventoryId : `[ID:${equip.id.substr(0,4)}]`;
    DB.logEquipmentAction(isUpdate ? 'UPDATE' : 'CREATE', `${isUpdate ? 'Actualización' : 'Registro'} de equipo: ${invId} (${equip.name})`);
  },
  deleteEquipment: (id: string) => {
    const items = DB.getEquipment();
    const item = items.find(i => i.id === id);
    if (!item) return;
    const filtered = items.filter(i => i.id !== id);
    saveData(STORAGE_KEYS.EQUIPMENT, filtered);
    const invId = (item.inventoryId && item.inventoryId !== 'NaN') ? item.inventoryId : `[ID:${item.id.substr(0,4)}]`;
    DB.logEquipmentAction('DELETE', `Eliminación de equipo: ${invId} (${item.name})`);
  },
  revertEquipmentDecommission: (id: string) => {
    const equipments = DB.getEquipment();
    const idx = equipments.findIndex(e => e.id === id);
    if (idx > -1) {
      equipments[idx].isDecommissioned = false;
      equipments[idx].updatedAt = new Date().toISOString().split('T')[0];
      saveData(STORAGE_KEYS.EQUIPMENT, equipments);
      const invId = (equipments[idx].inventoryId && equipments[idx].inventoryId !== 'NaN') ? equipments[idx].inventoryId : `[ID:${equipments[idx].id.substr(0,4)}]`;
      DB.logEquipmentAction('REVERT_DECOMMISSION', `Reversión de baja para el equipo: ${invId}`);
      
      // Auto-generate 'Anulación Baja' support ticket
      const tickets = DB.getTickets();
      const newTicket: SupportTicket = {
        id: Math.random().toString(36).substr(2, 9),
        equipmentId: id,
        date: new Date().toLocaleDateString('es-AR'),
        technician: DB.getCurrentSession()?.name || 'Administrador',
        type: 'Anulación Baja',
        description: `Se revierte la baja técnica del equipo. El equipo ha sido reincorporado al estado activo.`,
        affectedParts: []
      };
      tickets.unshift(newTicket);
      saveData(STORAGE_KEYS.TICKETS, tickets);
    }
  },

  getTickets: () => getInitialData(STORAGE_KEYS.TICKETS, [] as SupportTicket[]),
  saveTicket: (ticket: SupportTicket) => {
    const tickets = DB.getTickets();
    tickets.push(ticket);
    saveData(STORAGE_KEYS.TICKETS, tickets);
    ticket.affectedParts.forEach(ap => DB.updateStock(ap.partId, ap.quantity, ap.serial));
    
    if (ticket.type === 'Baja') {
      const equipments = DB.getEquipment();
      const idx = equipments.findIndex(e => e.id === ticket.equipmentId);
      if (idx > -1) {
        equipments[idx].isDecommissioned = true;
        equipments[idx].updatedAt = new Date().toISOString().split('T')[0];
        saveData(STORAGE_KEYS.EQUIPMENT, equipments);
        const invId = (equipments[idx].inventoryId && equipments[idx].inventoryId !== 'NaN') ? equipments[idx].inventoryId : `[ID:${equipments[idx].id.substr(0,4)}]`;
        DB.logEquipmentAction('DECOMMISSION', `Baja de equipo por soporte: ${invId}`);
      }
    }
  },
  clearTickets: () => {
    saveData(STORAGE_KEYS.TICKETS, []);
  },
  updateTicket: (ticket: SupportTicket) => {
    const tickets = DB.getTickets();
    const idx = tickets.findIndex(t => t.id === ticket.id);
    if (idx > -1) {
      tickets[idx] = ticket;
      saveData(STORAGE_KEYS.TICKETS, tickets);
    }
  },
  deleteTicket: (id: string) => {
    const tickets = DB.getTickets();
    const filtered = tickets.filter(t => t.id !== id);
    saveData(STORAGE_KEYS.TICKETS, filtered);
  },

  getCurrentSession: (): User | null => getInitialData(STORAGE_KEYS.SESSION, null),
  login: (username: string, password: string): User | null => {
    const users = DB.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      saveData(STORAGE_KEYS.SESSION, user);
      return user;
    }
    return null;
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
};
