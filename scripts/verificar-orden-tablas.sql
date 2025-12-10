-- ============================================================================
-- VERIFICAR ORDEN DE CREACIÓN DE TABLAS
-- Este script verifica que las tablas se pueden crear en el orden correcto
-- ============================================================================

-- Orden correcto de creación (sin dependencias circulares):
-- 1. whatsapp_accounts (sin dependencias)
-- 2. whatsapp_contacts (depende de whatsapp_accounts, sequence_id opcional)
-- 3. whatsapp_sequences (depende de whatsapp_accounts)
-- 4. whatsapp_sequence_messages (depende de whatsapp_sequences)
-- 5. whatsapp_messages (depende de whatsapp_contacts, whatsapp_accounts)
-- 6. puppeteer_queue (depende de whatsapp_contacts, whatsapp_accounts)
-- 7. puppeteer_config (depende de whatsapp_accounts)
-- 8. whatsapp_delivery_issues (depende de whatsapp_contacts, whatsapp_accounts, whatsapp_messages)
-- 9. whatsapp_webhook_logs (depende de whatsapp_accounts)

-- Verificar que todas las tablas existen
SELECT 
  'whatsapp_accounts' as tabla,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_accounts') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END as estado
UNION ALL
SELECT 'whatsapp_contacts', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_contacts') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END
UNION ALL
SELECT 'whatsapp_sequences',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_sequences') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END
UNION ALL
SELECT 'whatsapp_sequence_messages',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_sequence_messages') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END
UNION ALL
SELECT 'whatsapp_messages',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_messages') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END
UNION ALL
SELECT 'puppeteer_queue',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'puppeteer_queue') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END
UNION ALL
SELECT 'puppeteer_config',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'puppeteer_config') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END
UNION ALL
SELECT 'whatsapp_delivery_issues',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_delivery_issues') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END
UNION ALL
SELECT 'whatsapp_webhook_logs',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_webhook_logs') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END;

-- Verificar foreign keys
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE 'whatsapp%' OR tc.table_name = 'puppeteer_queue' OR tc.table_name = 'puppeteer_config'
ORDER BY tc.table_name, kcu.column_name;

