# 📋 FASE 0: PREPARACIÓN Y SETUP - PROGRESO

**Fecha de inicio:** $(date)  
**Estado:** 🟡 En progreso

---

## ✅ Subfase 0.1: Backup Completo

**Estado:** ✅ Completado

**Script creado:** `scripts/backup-firestore.js`

**Uso:**
```bash
npm run migration:backup
```

**Funcionalidades:**
- ✅ Exporta todas las colecciones de Firestore a JSON
- ✅ Serializa Timestamps y tipos especiales de Firebase
- ✅ Crea resumen con conteos
- ✅ Valida integridad de backups

**Colecciones respaldadas:**
- almacenCentral
- cityStock
- VentasSinConfirmar
- ventashistorico
- ventasporcobrar
- GenerarDeposito
- users
- despachos
- despachosHistorial
- numbers
- team_messages

**Próximo paso:** Ejecutar backup antes de continuar

---

## ⏳ Subfase 0.2: Setup Supabase

**Estado:** ⏳ Pendiente

**Tareas:**
- [ ] Crear proyecto Supabase
- [ ] Configurar variables de entorno (.env.local)
- [ ] Ejecutar schema SQL base
- [ ] Verificar conexión

**Variables de entorno necesarias:**
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

**Próximo paso:** Configurar Supabase y ejecutar schema

---

## ✅ Subfase 0.3: Scripts de Utilidad

**Estado:** ✅ Completado

**Scripts creados:**

### 1. `scripts/migration-logger.js`
Sistema de logging estructurado para todas las fases.

**Uso:**
```javascript
import { logger } from './migration-logger.js';
logger.info('Mensaje', { data });
logger.phaseStart('Nombre Fase', 1);
logger.validation('collection', firebaseCount, supabaseCount, match);
```

### 2. `scripts/validate-counts.js`
Compara conteos entre Firebase y Supabase.

**Uso:**
```bash
npm run migration:validate
# O para una colección específica:
npm run migration:validate -- --collection=users
```

### 3. `scripts/compare-data.js`
Compara datos específicos campo por campo.

**Uso:**
```bash
npm run migration:compare -- --collection=users --limit=10
```

### 4. `scripts/rollback-phase.js`
Permite revertir cambios de una fase específica.

**Uso:**
```bash
# Simulación (no elimina nada):
node scripts/rollback-phase.js --phase=1

# Ejecución real (requiere --confirm):
node scripts/rollback-phase.js --phase=1 --confirm
```

---

## 📝 Testing de Fase 0

**Estado:** ⏳ Pendiente

**Checklist:**
- [ ] Ejecutar backup completo
- [ ] Verificar que todos los JSON se generaron
- [ ] Validar que no hay archivos corruptos
- [ ] Contar documentos en cada colección
- [ ] Configurar Supabase
- [ ] Probar scripts de utilidad con datos de prueba

---

## 🚀 Próximos Pasos

1. **Ejecutar backup completo:**
   ```bash
   npm run migration:backup
   ```

2. **Configurar Supabase:**
   - Crear proyecto en supabase.com
   - Obtener URL y ANON KEY
   - Agregar a `.env.local`

3. **Instalar dependencia de Supabase:**
   ```bash
   npm install @supabase/supabase-js
   ```

4. **Probar scripts:**
   ```bash
   # Probar logger
   node -e "import('./scripts/migration-logger.js').then(m => m.logger.info('Test'))"
   
   # Probar validación (después de configurar Supabase)
   npm run migration:validate
   ```

---

## 📊 Métricas

- **Scripts creados:** 4/4 ✅
- **Backup:** Pendiente
- **Supabase:** Pendiente
- **Testing:** Pendiente

---

**Última actualización:** $(date)



