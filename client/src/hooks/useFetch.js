import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

// Memoria caché global en el cliente para evitar "parpadeos" o cargas en 0 al cambiar de módulos
const globalFetchCache = {};

/**
 * Custom Hook para peticiones GET asíncronas con caché inteligente (Stale-While-Revalidate).
 *
 * @param {string} url Endpoint a consultar
 * @param {object} initialParams Parámetros GET opcionales
 * @param {boolean} autoFetch Si es true, la petición se lanza al montar el componente
 */
export function useFetch(url, initialParams = {}, autoFetch = true) {
  const cacheKey = url + JSON.stringify(initialParams);
  
  // Inicializamos con caché si existe, para que no empiece "vacío" o en 0
  const [data, setData] = useState(globalFetchCache[cacheKey] || null);
  
  // Si hay caché, no mostramos pantalla de carga inicial
  const [loading, setLoading] = useState(autoFetch && !globalFetchCache[cacheKey]);
  const [error, setError] = useState(null);

  const execute = useCallback(async (background = false, overrideParams = null) => {
    const currentParams = overrideParams || initialParams;
    const currentKey = url + JSON.stringify(currentParams);

    // Solo bloqueamos la pantalla (loading=true) si NO es background Y no hay caché
    if (!background && !globalFetchCache[currentKey]) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await api.get(url, { params: currentParams });
      // Guardamos la respuesta fresca en la memoria caché
      globalFetchCache[currentKey] = response.data;
      setData(response.data);
      return response.data;
    } catch (err) {
      setError(err);
      console.error(`[useFetch Error] ${url}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(initialParams)]);

  useEffect(() => {
    if (autoFetch) {
      // Si ya hay caché, lo hacemos en "background" (true) para actualizar silenciosamente
      execute(!!globalFetchCache[cacheKey]);
    }
  }, [execute, autoFetch]);

  const refetch = (background = true, newParams = null) => execute(background, newParams);

  // Exponemos una función para actualizar la caché manualmente si es necesario
  const mutateData = (newData) => {
    globalFetchCache[cacheKey] = newData;
    setData(newData);
  };

  return { data, loading, error, refetch, setData: mutateData };
}
