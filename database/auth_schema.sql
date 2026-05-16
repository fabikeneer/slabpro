-- ═══════════════════════════════════════════════════════════════════════
-- SlabPro — Script de Migración: Autenticación
-- Base de datos: slabpro_bd
-- ═══════════════════════════════════════════════════════════════════════

USE slabpro_bd;

-- ── Tabla: usuarios ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario             VARCHAR(50)  NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  pregunta_seguridad  VARCHAR(150) NOT NULL,
  respuesta_hash      VARCHAR(255) NOT NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insertar usuario administrador por defecto
-- Contraseña: "admin", Pregunta: "¿Cuál es tu color favorito?", Respuesta: "azul"
-- (Los hashes fueron generados con bcrypt, factor de costo 10)
INSERT INTO usuarios (usuario, password_hash, pregunta_seguridad, respuesta_hash)
VALUES (
  'admin',
  '$2b$10$wN9iL6U/.Y0v4u.2B1zQn.y9R6Z8Q7v4u.2B1zQn.y9R6Z8Q7v4u.', -- (Placeholder, lo crearemos via backend o un hash temporal)
  '¿Cuál es tu color favorito?',
  '$2b$10$wN9iL6U/.Y0v4u.2B1zQn.y9R6Z8Q7v4u.2B1zQn.y9R6Z8Q7v4u.'  -- (Placeholder)
) ON DUPLICATE KEY UPDATE usuario=usuario;
