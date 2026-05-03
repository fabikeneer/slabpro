-- ═══════════════════════════════════════════════════════════════════════
-- SlabPro — Esquema de base de datos MySQL  (v2 — sincronizado con frontend)
-- Base de datos: slabpro_bd
-- ═══════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS slabpro_bd
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE slabpro_bd;

-- ── Tabla: clientes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(200)  NOT NULL,
  rif         VARCHAR(30)   DEFAULT NULL,
  telefono    VARCHAR(30)   DEFAULT NULL,
  email       VARCHAR(150)  DEFAULT NULL,
  direccion   TEXT          DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nombre (nombre),
  INDEX idx_rif    (rif)
) ENGINE=InnoDB;

-- ── Tabla: presupuestos ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presupuestos (
  id                   INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,

  -- Identificación
  numero_presupuesto   VARCHAR(30)     NOT NULL UNIQUE,
  cliente_id           INT UNSIGNED    NOT NULL,
  rif                  VARCHAR(30)     DEFAULT NULL   COMMENT 'Snapshot RIF cliente',
  email                VARCHAR(150)    DEFAULT NULL   COMMENT 'Snapshot email cliente',

  -- Proyecto
  proyecto_descripcion TEXT            DEFAULT NULL,
  validez_dias         TINYINT UNSIGNED NOT NULL DEFAULT 30,
  estatus              VARCHAR(30)     NOT NULL DEFAULT 'Pendiente'
                         COMMENT 'Pendiente | borrador | enviado | aprobado | rechazado | vencido',

  -- Finanzas
  tasa_dia             DECIMAL(12, 4)  NOT NULL DEFAULT 0.0000 COMMENT 'Tasa BCV/paralela del día',
  tasa_cambio_usd_bs   DECIMAL(12, 4)  NOT NULL DEFAULT 0.0000 COMMENT 'Tasa aplicada al presupuesto',
  subtotal_usd         DECIMAL(14, 2)  NOT NULL DEFAULT 0.00,
  total_usd            DECIMAL(14, 2)  NOT NULL DEFAULT 0.00,
  subtotal_bs          DECIMAL(18, 2)  NOT NULL DEFAULT 0.00,
  total_bs             DECIMAL(18, 2)  NOT NULL DEFAULT 0.00,

  -- Textos
  descripcion_legal    TEXT            DEFAULT NULL,
  observaciones        TEXT            DEFAULT NULL,

  -- Auditoría
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_numero   (numero_presupuesto),
  INDEX idx_cliente  (cliente_id),
  INDEX idx_estatus  (estatus),
  INDEX idx_fecha    (created_at)
) ENGINE=InnoDB;

-- ── Tabla: presupuesto_lineas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presupuesto_lineas (
  id                   INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  presupuesto_id       INT UNSIGNED    NOT NULL,

  tipo                 VARCHAR(50)     NOT NULL DEFAULT 'otro'
                         COMMENT 'piedra | carpinteria | flete | insumos | instalacion | otro',
  descripcion          VARCHAR(300)    DEFAULT NULL,
  metros_lineales      DECIMAL(10, 3)  NOT NULL DEFAULT 0.000,
  precio_unitario_usd  DECIMAL(12, 4)  NOT NULL DEFAULT 0.0000,
  precio_usd           DECIMAL(12, 4)  NOT NULL DEFAULT 0.0000 COMMENT 'Alias de precio_unitario_usd',
  cantidad             DECIMAL(10, 3)  NOT NULL DEFAULT 1.000,
  subtotal_usd         DECIMAL(14, 2)  NOT NULL DEFAULT 0.00,
  subtotal_bs          DECIMAL(18, 2)  NOT NULL DEFAULT 0.00,
  orden                TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_presupuesto (presupuesto_id)
) ENGINE=InnoDB;

-- ── Vista: resumen de presupuestos ──────────────────────────────────────
CREATE OR REPLACE VIEW v_presupuestos_resumen AS
SELECT
  p.id,
  p.numero_presupuesto,
  c.nombre          AS cliente_nombre,
  c.rif             AS cliente_rif,
  c.email           AS cliente_email,
  c.telefono        AS cliente_telefono,
  p.rif             AS presupuesto_rif,
  p.email           AS presupuesto_email,
  p.tasa_cambio_usd_bs,
  p.tasa_dia,
  p.subtotal_usd,
  p.subtotal_bs,
  p.total_usd,
  p.total_bs,
  p.estatus,
  p.validez_dias,
  DATE_ADD(p.created_at, INTERVAL p.validez_dias DAY) AS fecha_vencimiento,
  p.created_at,
  COUNT(l.id)       AS cantidad_lineas
FROM presupuestos p
JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN presupuesto_lineas l ON l.presupuesto_id = p.id
GROUP BY p.id;
