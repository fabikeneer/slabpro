import useSWR from 'swr';

const fetcher = async (url) => {
  const token = localStorage.getItem('token');
  const res = await fetch(import.meta.env.VITE_API_URL + url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }
  
  return res.json();
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
