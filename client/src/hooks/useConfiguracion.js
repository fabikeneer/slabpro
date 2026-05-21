import useSWR from 'swr';
import api from '../utils/api';

const fetcher = async (url) => {
  const res = await api.get(url);
  return res.data;
};

export function useConfiguracion() {
  const { data, error, isLoading, mutate } = useSWR('/api/config', fetcher, {
    revalidateOnFocus: false, // Evitar peticiones al cambiar de pestaña
    dedupingInterval: 60000, // No repetir la petición en menos de 1 minuto
  });

  return {
    configData: data?.data,
    tasaCambio: data?.data?.tasa_cambio || 0,
    isLoading,
    isError: error,
    recargarConfig: mutate // Función para forzar actualización
  };
}
