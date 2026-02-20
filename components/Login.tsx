
import React, { useState } from 'react';
import { DB } from '../services/db';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = DB.login(username, password);
    if (user) {
      onLogin(user);
    } else {
      setError('Credenciales incorrectas. Por favor, intente de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-[#3D3D3D] flex flex-col font-display relative overflow-hidden">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between absolute top-0 left-0 z-10">
        <div className="flex items-center gap-3 text-white">
          <div className="size-10 overflow-hidden">
            <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">CRM Gestión Técnica</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-white/10 text-white text-sm font-bold border border-white/20 hover:bg-white/20 transition-all">
            <span className="truncate">Soporte</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[440px] flex flex-col gap-10 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-48 mx-auto">
              <img src="input_file_0.png" alt="Branding Logo" className="w-full h-auto drop-shadow-2xl" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">Bienvenido</h1>
              <p className="text-gray-300 mt-2 text-base font-medium opacity-80">Ingrese sus credenciales para acceder al panel técnico</p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-col w-full">
              <label className="flex flex-col w-full">
                <p className="text-gray-200 text-sm font-semibold leading-normal pb-3 ml-1">Usuario</p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <span className="material-symbols-outlined !text-xl">person</span>
                  </div>
                  <input 
                    required
                    className="form-input flex w-full pl-12 resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[#4B7349]/50 border border-gray-600 bg-gray-800/50 focus:border-[#4B7349] h-14 placeholder:text-gray-500 text-base font-normal transition-all" 
                    placeholder="Ingrese su usuario" 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </label>
            </div>

            <div className="flex flex-col w-full">
              <label className="flex flex-col w-full">
                <p className="text-gray-200 text-sm font-semibold leading-normal pb-3 ml-1">Contraseña</p>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <span className="material-symbols-outlined !text-xl">lock</span>
                  </div>
                  <input 
                    required
                    className="form-input flex w-full pl-12 pr-12 resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[#4B7349]/50 border border-gray-600 bg-gray-800/50 focus:border-[#4B7349] h-14 placeholder:text-gray-500 text-base font-normal transition-all" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-gray-400 hover:text-[#4B7349] transition-colors"
                  >
                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </div>
                </div>
              </label>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400 text-sm font-bold text-center">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button 
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-[#4B7349] hover:bg-[#457330] active:scale-[0.98] text-white text-lg font-bold transition-all shadow-xl shadow-[#4B7349]/10" 
                type="submit"
              >
                <span className="truncate">Ingresar al Sistema</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-sm font-medium text-gray-300 px-1 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input className="rounded border-gray-600 bg-gray-800 text-[#4B7349] focus:ring-[#4B7349]" type="checkbox"/>
                <span>Recordarme</span>
              </label>
              <a className="hover:text-[#4B7349] underline decoration-[#4B7349]/30 underline-offset-4" href="#">¿Olvidó su contraseña?</a>
            </div>
          </form>

          <div className="pt-8 text-center text-white/40 text-[10px] border-t border-white/10 uppercase tracking-[0.2em]">
            <p>© 2024 Gestión Técnica CRM. Todos los derechos reservados.</p>
            <p className="mt-2 text-[#4B7349]/50">Professional Technical Support v2.5</p>
          </div>
        </div>
      </main>

      {/* Decorative background element */}
      <div className="fixed -bottom-20 -right-20 opacity-[0.03] pointer-events-none rotate-12">
        <img src="input_file_0.png" alt="Background Decorative" className="w-[600px] h-auto" />
      </div>
    </div>
  );
};

export default Login;
