-- ═══════════════════════════════════════════════════════════
-- SlabPro — Fix: Añadir columna faltante 'orden' + 'precio_usd'
-- Ejecuta esto en tu cliente MySQL si la migración no las creó
-- ═══════════════════════════════════════════════════════════

USE slabpro_bd;

-- 1. Agregar 'precio_usd' si no existe
ALTER TABLE presupuesto_lineas
  ADD COLUMN IF NOT EXISTS precio_usd DECIMAL(12,4) NOT NULL DEFAULT 0.0000
  COMMENT 'Alias precio_unitario_usd'
  AFTER precio_unitario_usd;

-- 2. Agregar 'orden' si no existe
ALTER TABLE presupuesto_lineas
  ADD COLUMN IF NOT EXISTS orden TINYINT UNSIGNED NOT NULL DEFAULT 0
  AFTER subtotal_bs;

-- Verificar resultado
DESCRIBE presupuesto_lineas;
