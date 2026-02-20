
import { Equipment, EquipmentLog, SparePart, SparePartLog, SupportTicket, User } from '../types';

const STORAGE_KEYS = {
  EQUIPMENT: 'crm_equipment',
  EQUIPMENT_LOGS: 'crm_equipment_logs',
  SPARE_PARTS: 'crm_spare_parts',
  SPARE_PARTS_LOGS: 'crm_spare_parts_logs',
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

export const DB = {
  getUsers: () => getInitialData(STORAGE_KEYS.USERS, mockUsers),
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
