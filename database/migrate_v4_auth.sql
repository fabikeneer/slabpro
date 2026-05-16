-- ═══════════════════════════════════════════════════════════════════════
-- SlabPro — Migración v4: Auth (Múltiples Preguntas y Correo)
-- Base de datos: slabpro_bd
-- ═══════════════════════════════════════════════════════════════════════

USE slabpro_bd;

DELIMITER $$

-- Procedimiento para agregar columna de forma segura
DROP PROCEDURE IF EXISTS agregar_columna_auth $$
CREATE PROCEDURE agregar_columna_auth(
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
  END IF;
END $$
DELIMITER ;

-- Agregar correo electrónico opcional
CALL agregar_columna_auth('usuarios', 'email', 'VARCHAR(150) DEFAULT NULL AFTER usuario');

-- Modificar columnas de seguridad para soportar JSON (TEXT)
ALTER TABLE usuarios MODIFY COLUMN pregunta_seguridad TEXT NOT NULL;
ALTER TABLE usuarios MODIFY COLUMN respuesta_hash TEXT NOT NULL;

-- Convertir datos existentes a JSON Arrays
-- Solo se aplica si el valor no comienza con un corchete '[' (asumiendo que no es JSON aún)
UPDATE usuarios 
SET pregunta_seguridad = CONCAT('["', REPLACE(pregunta_seguridad, '"', '\\"'), '"]')
WHERE pregunta_seguridad NOT LIKE '[%';

UPDATE usuarios 
SET respuesta_hash = CONCAT('["', REPLACE(respuesta_hash, '"', '\\"'), '"]')
WHERE respuesta_hash NOT LIKE '[%';

-- Limpieza
DROP PROCEDURE IF EXISTS agregar_columna_auth;
