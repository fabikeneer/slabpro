import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom Hook para peticiones GET asíncronas bajo principios SOLID (SRP).
 * 
 * @param {string} url Endpoint a consultar
 * @param {object} initialParams Parámetros GET opcionales
 * @param {boolean} autoFetch Si es true, la petición se lanza al montar el componente
 */
export function useFetch(url, initialParams = {}, autoFetch = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);

  // execute maneja la lógica de petición. 
  // 'background = true' silencia el 'setLoading' para actualizaciones reactivas invisibles.
  const execute = useCallback(async (background = false, overrideParams = null) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const response = await axios.get(url, { params: overrideParams || initialParams });
      setData(response.data);
      return response.data;
    } catch (err) {
      setError(err);
      console.error(`[useFetch Error] ${url}:`, err);
      throw err;
    } finally {
      if (!background) setLoading(false);
    }
  }, [url, JSON.stringify(initialParams)]);

  useEffect(() => {
    if (autoFetch) {
      execute();
    }
  }, [execute, autoFetch]);

  // Wrapper simplificado para refetch silencioso por defecto
  const refetch = (background = true, newParams = null) => execute(background, newParams);

  return { data, loading, error, refetch, setData };
}
