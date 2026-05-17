-- ═══════════════════════════════════════════════════════════════════════
-- SlabPro — Migración: cédula y correo únicos por usuario
-- Base de datos: slabpro_bd
-- ═══════════════════════════════════════════════════════════════════════

USE slabpro_bd;

-- Resolver duplicados de cédula antes de crear el índice (revisar manualmente si hay filas)
-- SELECT cedula, COUNT(*) FROM usuarios WHERE cedula IS NOT NULL AND cedula != '' GROUP BY cedula HAVING COUNT(*) > 1;

-- Resolver duplicados de correo (ignorar NULL)
-- SELECT LOWER(email), COUNT(*) FROM usuarios WHERE email IS NOT NULL AND email != '' GROUP BY LOWER(email) HAVING COUNT(*) > 1;

-- Índice único en cédula (varios NULL permitidos en MySQL)
-- Si el índice ya existe, omitir o ejecutar: node run_migration_usuarios_unique.js
CREATE UNIQUE INDEX uk_usuarios_cedula ON usuarios (cedula);

-- Índice único en correo (varios NULL permitidos)
CREATE UNIQUE INDEX uk_usuarios_email ON usuarios (email);
