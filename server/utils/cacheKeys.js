/** TTL en segundos */
const TTL = {
  DASHBOARD: 120,   // 2 min — resumen inicio
  LIST: 180,        // 3 min — listados paginados
  ACTIVOS: 300,     // 5 min — dropdowns proyectos/empleados
  EXCHANGE: 1800,   // 30 min — tasa del dólar
  CONFIG: 43200,    // 12 h — configuración empresa
};

/** Prefijos para invalidación por grupo */
const PREFIX = {
  dashboard: 'sp:dash:',
  presupuestos: 'sp:pres:',
  proyectos: 'sp:proy:',
  gastos: 'sp:gast:',
  clientes: 'sp:cli:',
  nomina: 'sp:nom:',
  exchange: 'sp:fx:',
  config: 'configuracion_empresa',
};

/** Clave estable a partir de query params */
function queryKey(prefix, query = {}) {
  const parts = Object.keys(query)
    .sort()
    .filter((k) => query[k] !== undefined && query[k] !== '')
    .map((k) => `${k}=${query[k]}`);
  return `${prefix}${parts.join('&') || 'all'}`;
}

const keys = {
  dashboard: () => `${PREFIX.dashboard}resumen`,
  exchangeRate: () => `${PREFIX.exchange}rate`,
  presupuestosList: (page, limit) => queryKey(PREFIX.presupuestos, { page, limit }),
  presupuestoDetail: (id) => `${PREFIX.presupuestos}id:${id}`,
  proyectosList: (page, limit) => queryKey(PREFIX.proyectos, { page, limit }),
  proyectosActivos: () => `${PREFIX.proyectos}activos`,
  proyectoFicha: (id) => `${PREFIX.proyectos}ficha:${id}`,
  gastosList: (query) => queryKey(PREFIX.gastos, query),
  clientesList: (q) => queryKey(PREFIX.clientes, { q: q || '' }),
  clienteDetail: (id) => `${PREFIX.clientes}id:${id}`,
  nominaReporte: (query) => queryKey(`${PREFIX.nomina}reporte:`, query),
  nominaEmpleados: () => `${PREFIX.nomina}empleados`,
  nominaProyectos: () => `${PREFIX.nomina}proyectos`,
};

module.exports = { TTL, PREFIX, keys, queryKey };
