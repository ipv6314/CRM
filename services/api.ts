/**
 * Configuración centralizada de la URL Base de la API
 * Lee de la variable de entorno VITE_API_URL o utiliza por defecto la IP local
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000/api` : 'http://10.254.12.121:3000/api');

/**
 * Helper para realizar peticiones HTTP a la API del backend
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || 'Error en la petición a la API');
  }

  return response.json();
}
