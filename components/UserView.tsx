
import React, { useState, useRef } from 'react';
import { DB } from '../services/db';
import { User } from '../types';

const UserView: React.FC = () => {
  const [users, setUsers] = useState<User[]>(DB.getUsers());
  const [editing, setEditing] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const newUser = { ...editing, id: editing.id || Math.random().toString(36).substr(2, 9) };
    DB.saveUser(newUser);
    setUsers(DB.getUsers());
    setEditing(null);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(users, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'usuarios.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            let importCount = 0;
            parsed.forEach((importedUser: any) => {
              if (importedUser.username && importedUser.name) {
                const userToSave: User = {
                  id: importedUser.id || Math.random().toString(36).substr(2, 9),
                  username: String(importedUser.username),
                  password: String(importedUser.password || '123456'),
                  name: String(importedUser.name),
                  role: importedUser.role === 'admin' ? 'admin' : 'technician',
                  legajo: String(importedUser.legajo || '0000'),
                  email: importedUser.email ? String(importedUser.email) : undefined
                };
                DB.saveUser(userToSave);
                importCount++;
              }
            });
            setUsers(DB.getUsers());
            alert(`Se han importado ${importCount} usuarios con éxito de forma persistente.`);
          } else {
            alert("Formato inválido: El archivo JSON debe contener un array de usuarios.");
          }
        } catch (err) {
          alert("Error al leer el archivo JSON. Asegúrese de que sea un archivo JSON válido.");
        }
      };
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-[#181411]">Administración de Usuarios</h2>
          <p className="text-[#897161]">Gestión de accesos, roles y credenciales de personal</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportJSON} 
            accept=".json" 
            className="hidden" 
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 h-11 rounded-xl border-2 border-[#4B7349] text-[#4B7349] font-bold hover:bg-[#4B7349]/5 transition-colors cursor-pointer text-xs uppercase tracking-wide"
          >
            <span className="material-symbols-outlined text-sm">upload</span>
            Importar JSON
          </button>
          <button 
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 h-11 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-colors cursor-pointer text-xs uppercase tracking-wide"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Exportar JSON
          </button>
          <button 
            type="button"
            onClick={() => setEditing({ id: '', username: '', password: '', name: '', role: 'technician', legajo: '' })}
            className="bg-[#3D3D3D] text-white px-5 h-11 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition-all text-xs uppercase tracking-wide cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Agregar Usuario
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b text-gray-500 font-black uppercase text-[10px] tracking-widest">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Nombre Completo</th>
              <th className="px-6 py-4">Legajo</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-green-50/20 transition-colors">
                <td className="px-6 py-4 font-bold text-[#4B7349]">{user.username}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#3D3D3D]">{user.name}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{user.email || 'Sin Email Registrado'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs font-bold text-gray-600">{user.legajo}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                    user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditing(user)} className="text-blue-500 material-symbols-outlined hover:bg-blue-50 p-2 rounded-xl transition-colors">edit</button>
                    <button 
                      onClick={() => {
                        if (confirm(`Eliminar a ${user.name}?`)) {
                          DB.deleteUser(user.id);
                          setUsers(DB.getUsers());
                        }
                      }} 
                      className="text-red-500 material-symbols-outlined hover:bg-red-50 p-2 rounded-xl transition-colors"
                    >
                      delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-[#3D3D3D]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#4B7349] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <span className="material-symbols-outlined">person_outline</span>
                 <h3 className="font-black uppercase tracking-tight text-sm">Ficha de Usuario</h3>
              </div>
              <button onClick={() => setEditing(null)} className="material-symbols-outlined hover:rotate-90 transition-all">close</button>
            </div>
            <form onSubmit={handleSave} className="p-8 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Username</label>
                  <input 
                    className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:border-transparent" 
                    value={editing.username} 
                    onChange={e => setEditing({...editing, username: e.target.value})} 
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Contraseña</label>
                  <input 
                    type="password"
                    placeholder="••••••••"
                    className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:border-transparent" 
                    value={editing.password} 
                    onChange={e => setEditing({...editing, password: e.target.value})} 
                    required={!editing.id}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
                  <input 
                    className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:border-transparent" 
                    value={editing.name} 
                    onChange={e => setEditing({...editing, name: e.target.value})} 
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Legajo Personal</label>
                  <input 
                    className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:border-transparent font-mono font-bold" 
                    placeholder="Ej: 123456"
                    value={editing.legajo} 
                    onChange={e => setEditing({...editing, legajo: e.target.value})} 
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Email (Opcional)</label>
                <input 
                  type="email"
                  placeholder="usuario@dominio.com"
                  className="h-11 rounded-xl border-gray-100 bg-gray-50 focus:ring-2 focus:ring-[#4B7349] focus:border-transparent" 
                  value={editing.email || ''} 
                  onChange={e => setEditing({...editing, email: e.target.value})} 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Perfil de Acceso</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setEditing({...editing, role: 'technician'})}
                    className={`flex-1 h-11 rounded-xl font-bold text-xs transition-all border-2 ${editing.role === 'technician' ? 'bg-green-50 border-[#4B7349] text-[#4B7349]' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                  >
                    TÉCNICO
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditing({...editing, role: 'admin'})}
                    className={`flex-1 h-11 rounded-xl font-bold text-xs transition-all border-2 ${editing.role === 'admin' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                  >
                    ADMIN
                  </button>
                </div>
              </div>

              <button type="submit" className="mt-4 bg-[#3D3D3D] text-white h-14 rounded-2xl font-black uppercase text-sm shadow-xl shadow-gray-200 hover:bg-black transition-all">
                Guardar Usuario
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserView;
