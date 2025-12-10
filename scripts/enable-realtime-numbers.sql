-- Script para habilitar Realtime en la tabla mis_numeros
-- Ejecutar en Supabase SQL Editor si la suscripción en tiempo real no funciona
-- NOTA: Si ya ejecutaste rename-numbers-to-mis-numeros.sql, esto ya está incluido

-- Habilitar Realtime para la tabla mis_numeros
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS numbers;
ALTER PUBLICATION supabase_realtime ADD TABLE mis_numeros;

-- Verificar que esté habilitado (opcional)
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'mis_numeros';

