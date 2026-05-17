/** URL base del API (vacía en local → proxy Vite en /api) */
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Ruta absoluta hacia el API (fetch, enlaces, etc.) */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}
