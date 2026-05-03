-- ═══════════════════════════════════════════════════════════════════════
-- SlabPro — Migración v3: Compatible MySQL 5.7 y 8.0
-- Base de datos: slabpro_bd
-- ═══════════════════════════════════════════════════════════════════════

USE slabpro_bd;

DELIMITER $$

-- ── Procedimiento auxiliar: agrega columna si no existe ─────────────────
DROP PROCEDURE IF EXISTS agregar_columna $$
CREATE PROCEDURE agregar_columna(
  IN tbl  VARCHAR(100),
  IN col  VARCHAR(100),
  IN def  TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND COLUMN_NAME  = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', col, ' ', def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('✅ Columna añadida: ', tbl, '.', col) AS resultado;
  ELSE
    SELECT CONCAT('⚠️  Ya existe: ', tbl, '.', col) AS resultado;
  END IF;
END $$

DELIMITER ;

-- ═══════════════════════════════════════════════════════════════════════
-- TABLA: presupuestos
-- ═══════════════════════════════════════════════════════════════════════

CALL agregar_columna('presupuestos', 'rif',
  "VARCHAR(30) DEFAULT NULL COMMENT 'Snapshot RIF cliente' AFTER cliente_id");

CALL agregar_columna('presupuestos', 'email',
  "VARCHAR(150) DEFAULT NULL COMMENT 'Snapshot email cliente' AFTER rif");

CALL agregar_columna('presupuestos', 'tasa_dia',
  "DECIMAL(12,4) NOT NULL DEFAULT 0.0000 COMMENT 'Tasa del día' AFTER email");

CALL agregar_columna('presupuestos', 'subtotal_bs',
  "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER subtotal_usd");

-- Flexibilizar estatus (ENUM → VARCHAR para aceptar 'Pendiente')
ALTER TABLE presupuestos
  MODIFY COLUMN estatus VARCHAR(30) NOT NULL DEFAULT 'Pendiente';

-- ═══════════════════════════════════════════════════════════════════════
-- TABLA: presupuesto_lineas
-- Estrategia: si existe con esquema incompleto → DROP + CREATE
--             (seguro porque aún no hay datos reales)
-- ═══════════════════════════════════════════════════════════════════════

-- Verificamos si la columna metros_lineales ya existe
SET @tiene_metros = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'presupuesto_lineas'
    AND COLUMN_NAME  = 'metros_lineales'
);

-- Si la tabla existe pero le falta metros_lineales → la recreamos
SET @tiene_tabla = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'presupuesto_lineas'
);

-- Borrar tabla incompleta (sin datos útiles aún)
SET @drop_sql = IF(
  @tiene_tabla = 1 AND @tiene_metros = 0,
  'DROP TABLE IF EXISTS presupuesto_lineas',
  'SELECT "presupuesto_lineas no necesita recrearse" AS info'
);
PREPARE drop_stmt FROM @drop_sql;
EXECUTE drop_stmt;
DEALLOCATE PREPARE drop_stmt;

-- Crear tabla completa con todos los campos
CREATE TABLE IF NOT EXISTS presupuesto_lineas (
  id                   INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  presupuesto_id       INT UNSIGNED     NOT NULL,
  tipo                 VARCHAR(50)      NOT NULL DEFAULT 'otro'
                         COMMENT 'piedra | carpinteria | flete | insumos | instalacion | otro',
  descripcion          VARCHAR(300)     DEFAULT NULL,
  metros_lineales      DECIMAL(10,3)    NOT NULL DEFAULT 0.000,
  precio_unitario_usd  DECIMAL(12,4)    NOT NULL DEFAULT 0.0000,
  precio_usd           DECIMAL(12,4)    NOT NULL DEFAULT 0.0000
                         COMMENT 'Alias de precio_unitario_usd',
  cantidad             DECIMAL(10,3)    NOT NULL DEFAULT 1.000,
  subtotal_usd         DECIMAL(14,2)    NOT NULL DEFAULT 0.00,
  subtotal_bs          DECIMAL(18,2)    NOT NULL DEFAULT 0.00,
  orden                TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at           DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (presupuesto_id)
    REFERENCES presupuestos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_presupuesto (presupuesto_id)
) ENGINE=InnoDB;

-- Si ya existía con metros_lineales, agregar columnas opcionales que pudieran faltar
CALL agregar_columna('presupuesto_lineas', 'precio_usd',
  "DECIMAL(12,4) NOT NULL DEFAULT 0.0000 COMMENT 'Alias precio_unitario_usd' AFTER precio_unitario_usd");

CALL agregar_columna('presupuesto_lineas', 'orden',
  "TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER subtotal_bs");

-- ═══════════════════════════════════════════════════════════════════════
-- VISTA ACTUALIZADA
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_presupuestos_resumen AS
SELECT
  p.id,
  p.numero_presupuesto,
  c.nombre          AS cliente_nombre,
  c.rif             AS cliente_rif,
  c.email           AS cliente_email,
  c.telefono        AS cliente_telefono,
  p.tasa_cambio_usd_bs,
  p.subtotal_usd,
  p.subtotal_bs,
  p.total_usd,
  p.total_bs,
  p.estatus,
  p.validez_dias,
  DATE_ADD(p.created_at, INTERVAL p.validez_dias DAY) AS fecha_vencimiento,
  p.created_at,
  COUNT(l.id) AS cantidad_lineas
FROM presupuestos p
JOIN clientes c ON p.cliente_id = c.id_cliente
LEFT JOIN presupuesto_lineas l ON l.presupuesto_id = p.id
GROUP BY p.id;

-- ═══════════════════════════════════════════════════════════════════════
-- LIMPIEZA
-- ═══════════════════════════════════════════════════════════════════════
DROP PROCEDURE IF EXISTS agregar_columna;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL — Debes ver metros_lineales en presupuesto_lineas
-- ═══════════════════════════════════════════════════════════════════════
DESCRIBE presupuesto_lineas;
DESCRIBE presupuestos;
