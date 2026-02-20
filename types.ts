
export interface User {
  id: string;
  username: string;
  password?: string; // Mandatory for new users
  name: string;
  role: 'admin' | 'technician';
  email?: string; // Now optional
  legajo: string; // Mandatory personal ID
}

export interface Equipment {
  id: string;
  inventoryId: string;
  effector: string;
  area: string;
  service: string;
  consultorio?: string;
  brand: string;
  model: string;
  type: string;
  serialNumber?: string;
  os: string;
  cpu: string;
  speed: string;
  ramModule: 'DIMM' | 'SODIMM' | string;
  ramGeneration: 'DDR2' | 'DDR3' | 'DDR4' | 'DDR5' | string;
  ramCapacity: string;
  storageType: 'HDD' | 'SSD' | string;
  storageCapacity: string;
  comments: string;
  macLan?: string;
  macWireless?: string;
  name: string; // Identificador amigable (ej: "PC de Oficina")
  createdAt: string;
  updatedAt: string;
  isDecommissioned?: boolean;
}

export interface EquipmentLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DECOMMISSION' | 'REVERT_DECOMMISSION';
  details: string;
}

export interface SparePart {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  isSerialized: boolean;
  serials?: string[];
}

export interface SparePartLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STOCK_ADJUST';
  details: string;
}

export interface SupportTicket {
  id: string;
  equipmentId: string;
  date: string;
  technician: string;
  type: 'Hardware' | 'Software' | 'Redes' | 'Otros' | 'Baja';
  description: string;
  affectedParts: { 
    partId: string; 
    quantity: number;
    serial?: string; 
  }[];
  dictamen?: {
    solicitante: string;
    legajo: string;
    image?: string;
  };
}

export enum ViewState {
  Dashboard = 'dashboard',
  Equipos = 'equipos',
  Soporte = 'soporte',
  Repuestos = 'repuestos',
  Usuarios = 'usuarios'
}
