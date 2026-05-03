-- ═══════════════════════════════════════════════════════════════════════
-- SlabPro — Migración v4: Módulo de Gastos
-- Base de datos: slabpro_bd
-- ═══════════════════════════════════════════════════════════════════════

USE slabpro_bd;

-- ── Tabla principal de gastos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gastos (
  id_gasto     INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  id_proyecto  INT UNSIGNED     DEFAULT NULL
                 COMMENT 'Opcional: vincula el gasto a un proyecto',
  categoria    ENUM(
                 'Insumos',
                 'Fletes',
                 'Pagos Externos',
                 'Nómina',
                 'Otros'
               ) NOT NULL DEFAULT 'Otros',
  descripcion  VARCHAR(500)     NOT NULL,
  monto_usd    DECIMAL(14, 2)   NOT NULL DEFAULT 0.00,
  monto_bs     DECIMAL(18, 2)   NOT NULL DEFAULT 0.00,
  tasa_usdt    DECIMAL(12, 4)   NOT NULL DEFAULT 0.0000
                 COMMENT 'Tasa USDT/Bs capturada al momento del gasto',
  fecha_gasto  DATE             NOT NULL,
  created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_categoria   (categoria),
  INDEX idx_fecha       (fecha_gasto),
  INDEX idx_proyecto    (id_proyecto)
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- ── Columnas faltantes en gastos si la tabla ya existía ─────────────────
-- (Idempotente: solo agrega si no existe)

-- Agregar monto_bs si falta
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'gastos'
    AND COLUMN_NAME  = 'monto_bs'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE gastos ADD COLUMN monto_bs DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER monto_usd',
  'SELECT "monto_bs ya existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Agregar tasa_usdt si falta
SET @col_exists2 = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'gastos'
    AND COLUMN_NAME  = 'tasa_usdt'
);
SET @sql2 = IF(@col_exists2 = 0,
  'ALTER TABLE gastos ADD COLUMN tasa_usdt DECIMAL(12,4) NOT NULL DEFAULT 0.0000 AFTER monto_bs',
  'SELECT "tasa_usdt ya existe" AS info'
);
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- Agregar updated_at si falta
SET @col_exists3 = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'gastos'
    AND COLUMN_NAME  = 'updated_at'
);
SET @sql3 = IF(@col_exists3 = 0,
  'ALTER TABLE gastos ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT "updated_at ya existe" AS info'
);
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- ── Vista de gastos consolidados ─────────────────────────────────────────
CREATE OR REPLACE VIEW v_gastos_resumen AS
SELECT
  g.id_gasto,
  g.categoria,
  g.descripcion,
  g.monto_usd,
  g.monto_bs,
  g.tasa_usdt,
  g.fecha_gasto,
  g.created_at,
  COALESCE(pr.nombre_proyecto, pr.nombre_cliente, 'Sin proyecto') AS proyecto_nombre
FROM gastos g
LEFT JOIN proyectos pr ON g.id_proyecto = pr.id_proyecto
ORDER BY g.fecha_gasto DESC;

-- ── Verificación ─────────────────────────────────────────────────────────
DESCRIBE gastos;
SELECT 'Migración de gastos completada ✅' AS resultado;
