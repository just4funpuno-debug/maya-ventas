# FASE 7.1: Integración con Sistema de Ventas - Plan Detallado

## 📋 Objetivo

Integrar el sistema de ventas existente con el CRM de WhatsApp, permitiendo:
1. Asociar contactos de WhatsApp con ventas
2. Crear contactos automáticamente desde ventas
3. Mostrar historial de ventas en el chat de WhatsApp

## 📋 SUBFASE 7.1.1: Migración de Base de Datos

### Tareas:
- [ ] Agregar columna `sale_id` a `whatsapp_contacts` (opcional, para asociar contacto con venta específica)
- [ ] Crear tabla `whatsapp_contact_sales` para relación muchos-a-muchos (un contacto puede tener múltiples ventas)
- [ ] Agregar índices para búsquedas rápidas

### Archivos:
- `supabase/migrations/006_sales_integration.sql` (nuevo)

---

## 📋 SUBFASE 7.1.2: Servicio de Integración

### Tareas:
- [ ] Crear `src/services/whatsapp/sales-integration.js`
- [ ] Implementar `createContactFromSale(saleId, accountId)` - Crear contacto desde venta
- [ ] Implementar `associateContactWithSale(contactId, saleId)` - Asociar contacto con venta
- [ ] Implementar `getContactSales(contactId)` - Obtener ventas de un contacto
- [ ] Implementar `getSaleContact(saleId)` - Obtener contacto de una venta
- [ ] Implementar `findContactByPhone(phone, accountId)` - Buscar contacto por teléfono

### Archivos:
- `src/services/whatsapp/sales-integration.js` (nuevo)

---

## 📋 SUBFASE 7.1.3: Componente de Historial de Ventas

### Tareas:
- [ ] Crear `src/components/whatsapp/SalesHistory.jsx`
- [ ] Mostrar lista de ventas asociadas a un contacto
- [ ] Mostrar detalles de cada venta (fecha, productos, total, estado)
- [ ] Integrar en `ChatWindow.jsx`

### Archivos:
- `src/components/whatsapp/SalesHistory.jsx` (nuevo)
- `src/components/whatsapp/ChatWindow.jsx` (modificar)

---

## 📋 SUBFASE 7.1.4: Integración en Formulario de Ventas

### Tareas:
- [ ] Agregar botón "Crear contacto WhatsApp" en formulario de ventas
- [ ] Al crear venta, ofrecer crear contacto automáticamente
- [ ] Mostrar contacto asociado en vista de venta

### Archivos:
- `src/components/SaleForm.jsx` (modificar)
- `src/features/sales/SalesPage.jsx` (modificar)

---

## 📋 SUBFASE 7.1.5: Testing y Documentación

### Tareas:
- [ ] Crear tests unitarios para `sales-integration.js`
- [ ] Probar flujo completo: crear venta → crear contacto → asociar
- [ ] Documentar uso de la integración

### Archivos:
- `tests/whatsapp/sales-integration.test.js` (nuevo)

---

## ✅ Criterios de Éxito

- ✅ Se puede crear contacto desde venta
- ✅ Se puede asociar contacto con venta existente
- ✅ Se muestra historial de ventas en chat
- ✅ Se puede buscar contacto por teléfono de venta
- ✅ Tests pasando

---

**Tiempo Total Estimado:** 3-4 horas


