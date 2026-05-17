// hooks/useBudget.js — Estado y lógica del Módulo de Presupuestos
import { useState, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { toastSuccess, toastError } from '../utils/alerts';

// ── Tipos de campo disponibles ────────────────────────────────────────────
export const TIPOS_LINEA = [
  { value: 'piedra',      label: 'Tipo de Piedra'   },
  { value: 'porcelanato', label: 'Porcelanato'       },
  { value: 'carpinteria', label: 'Carpintería'       },
  { value: 'flete',       label: 'Flete'             },
  { value: 'drywall',     label: 'Drywall'           },
  { value: 'instalacion', label: 'Instalación'       },
  { value: 'otro',        label: 'Otro'              },
];

export const TIPOS_PIEDRA = [
  'Granito', 'Cuarzo', 'Mármol', 'Piedra Sinterizada', 'Otro',
];

// ── Línea vacía por defecto ───────────────────────────────────────────────
const crearLineaVacia = (orden = 0, tipo = 'piedra', id = null) => ({
  _id:                 id || crypto.randomUUID(),  // ID local temporal
  tipo:                tipo,
  descripcion:         '',
  metros_lineales:     '',
  precio_unitario_usd: '',
  cantidad:            1,
  orden,
});

// ── Estado inicial del formulario ─────────────────────────────────────────
const estadoInicial = () => ({
  // Cliente
  cliente_id:        '',
  cliente_nombre:    '',
  cliente_rif:       '',
  cliente_telefono:  '',
  cliente_email:     '',
  cliente_direccion: '',

  // Presupuesto
  proyecto_descripcion: '',
  tasa_cambio_usd_bs:   36,   // Tasa del día (editable)
  descripcion_legal:    'Los materiales descritos son de primera calidad, certificados según normativas vigentes. Los precios están sujetos a disponibilidad de inventario y validez del presente presupuesto.',
  observaciones:        '',
  validez_dias:         15,

  // Líneas
  lineas: [crearLineaVacia(0, 'piedra')],
});

// ─────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────
export function useBudget() {
  const [form, setForm]       = useState(estadoInicial);
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(null); // presupuesto guardado

  // ── Actualizar campo raíz ───────────────────────────────────────────
  const setField = useCallback((campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }, []);

  // ── Actualizar campo de una línea específica ────────────────────────
  const setLineaField = useCallback((_id, campo, valor) => {
    setForm(prev => ({
      ...prev,
      lineas: prev.lineas.map(l =>
        l._id === _id ? { ...l, [campo]: valor } : l
      ),
    }));
  }, []);

  // ── Agregar nueva línea ─────────────────────────────────────────────
  const agregarLinea = useCallback((tipo = 'piedra') => {
    const nuevaId = crypto.randomUUID();
    setForm(prev => ({
      ...prev,
      lineas: [
        ...prev.lineas,
        crearLineaVacia(prev.lineas.length, tipo, nuevaId),
      ],
    }));
    return nuevaId;
  }, []);

  // ── Eliminar línea ──────────────────────────────────────────────────
  const eliminarLinea = useCallback((_id) => {
    setForm(prev => ({
      ...prev,
      lineas: prev.lineas.filter(l => l._id !== _id),
    }));
  }, []);

  // ── Cálculo de totales (memo para performance) ──────────────────────
  const totales = useMemo(() => {
    const tasa = parseFloat(form.tasa_cambio_usd_bs) || 0;

    const lineasCalculadas = form.lineas.map(l => {
      const precio  = parseFloat(l.precio_unitario_usd) || 0;
      const metros  = parseFloat(l.metros_lineales)     || 0;
      const cant    = parseFloat(l.cantidad)             || 1;

      // Si tiene metros lineales, multiplicar: precio × metros × cantidad
      // Si es servicio (flete, insumos, etc.), multiplicar: precio × cantidad
      const subtotalUSD = metros > 0
        ? precio * metros * cant
        : precio * cant;

      return {
        ...l,
        subtotalUSD,
        subtotalBs: subtotalUSD * tasa,
      };
    });

    const totalUSD = lineasCalculadas.reduce((acc, l) => acc + l.subtotalUSD, 0);
    const totalBs  = totalUSD * tasa;

    return { lineasCalculadas, totalUSD, totalBs, tasa };
  }, [form.lineas, form.tasa_cambio_usd_bs]);

  // ── Guardar presupuesto en la BD ────────────────────────────────────
  const guardarPresupuesto = useCallback(async () => {
    // Validaciones básicas
    if (!form.cliente_nombre && !form.cliente_id) {
      toastError('El nombre del cliente es obligatorio.');
      return;
    }
    if (form.lineas.length === 0) {
      toastError('Agregue al menos una línea al presupuesto.');
      return;
    }
    if (!form.tasa_cambio_usd_bs || parseFloat(form.tasa_cambio_usd_bs) <= 0) {
      toastError('Ingrese una tasa de cambio USD/Bs válida.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        // Cliente
        cliente_id:        form.cliente_id     || null,
        cliente_nombre:    form.cliente_nombre,
        cliente_rif:       form.cliente_rif,
        cliente_telefono:  form.cliente_telefono,
        cliente_email:     form.cliente_email,
        cliente_direccion: form.cliente_direccion,

        // Presupuesto
        proyecto_descripcion: form.proyecto_descripcion,
        tasa_cambio_usd_bs:   parseFloat(form.tasa_cambio_usd_bs),
        descripcion_legal:    form.descripcion_legal,
        observaciones:        form.observaciones,
        validez_dias:         parseInt(form.validez_dias) || 15,

        // Líneas (limpiar IDs temporales)
        lineas: form.lineas.map((l, idx) => ({
          tipo:                l.tipo,
          descripcion:         l.descripcion,
          metros_lineales:     parseFloat(l.metros_lineales) || 0,
          precio_unitario_usd: parseFloat(l.precio_unitario_usd) || 0,
          cantidad:            parseFloat(l.cantidad) || 1,
          orden:               idx,
        })),
      };

      let data;
      if (form.id) {
        const res = await api.put(`/api/presupuestos/${form.id}`, payload);
        data = res.data;
      } else {
        const res = await api.post('/api/presupuestos', payload);
        data = res.data;
      }

      if (data.success) {
        toastSuccess(`${data.message}`);
        setGuardado(data.data);
      } else {
        toastError(data.message || 'Error al guardar.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toastError(`Error: ${msg}`);
      console.error('Error guardando presupuesto:', err);
    } finally {
      setLoading(false);
    }
  }, [form]);

  // ── Resetear formulario ─────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setForm(estadoInicial());
    setGuardado(null);
  }, []);

  return {
    form,
    setForm,
    setField,
    setLineaField,
    agregarLinea,
    eliminarLinea,
    totales,
    guardarPresupuesto,
    resetForm,
    loading,
    guardado,
  };
}
