# 📋 Guía de Implementación - Sistema de Notificaciones

## 🎯 Resumen

Este sistema de notificaciones ha sido completamente actualizado para integrarse con el nuevo modelo de negocio de Peri Institute, incluyendo notificaciones automáticas para tareas, exámenes, materiales y pagos.

---

## 📦 Archivos Creados/Modificados

### 1. **Migraciones SQL**
- ✅ `supabase/migrations/20260205000000_update_notifications_system.sql`
  - Actualiza la tabla `notifications` con nuevos campos
  - Crea funciones helper para notificaciones
  - Implementa triggers automáticos
  
- ✅ `supabase/migrations/20260205000001_notifications_rls_and_cron.sql`
  - Configura políticas RLS
  - Define tareas programadas (cron jobs)
  - Crea funciones de utilidad para administración

### 2. **Componentes React**
- ✅ `src/components/Notifications.tsx` - Actualizado con nuevos tipos
- ✅ `src/components/NotificationBell.tsx` - Badge de notificaciones para navbar
- ✅ `src/hooks/useNotifications.tsx` - Hook para gestión de notificaciones
- ✅ `src/pages/NotificationsPage.tsx` - Página completa de notificaciones

### 3. **Scripts de Prueba**
- ✅ `supabase/test_notifications.sql` - Scripts para generar notificaciones de prueba

### 4. **Documentación**
- ✅ `SISTEMA_NOTIFICACIONES_README.md` - Documentación completa del sistema

---

## 🚀 Pasos de Implementación

### Paso 1: Ejecutar Migraciones en Supabase

1. Abre tu proyecto en Supabase Dashboard
2. Ve a **SQL Editor**
3. Ejecuta los siguientes archivos en orden:

```sql
-- Primero: Actualizar tabla y crear funciones/triggers
-- Copiar y pegar contenido de:
-- supabase/migrations/20260205000000_update_notifications_system.sql

-- Segundo: Configurar RLS y tareas programadas
-- Copiar y pegar contenido de:
-- supabase/migrations/20260205000001_notifications_rls_and_cron.sql
```

### Paso 2: Habilitar pg_cron (si no está habilitado)

1. En Supabase Dashboard: **Database** → **Extensions**
2. Busca `pg_cron` y habilítalo
3. Verifica que las tareas programadas se crearon:

```sql
SELECT * FROM cron.job ORDER BY jobid;
```

### Paso 3: Integrar NotificationBell en el Navbar

Agrega el componente `NotificationBell` a tu navbar/header principal:

```tsx
// En tu componente de Layout o Navbar
import { NotificationBell } from '@/components/NotificationBell';

// Dentro del JSX, junto a otros elementos del navbar:
<NotificationBell />
```

### Paso 4: Agregar Ruta para la Página de Notificaciones

En tu archivo de rutas principal (probablemente `App.tsx` o similar):

```tsx
import NotificationsPage from '@/pages/NotificationsPage';

// Agregar la ruta:
<Route path="/notifications" element={<NotificationsPage />} />
```

### Paso 5: Verificar Políticas RLS

Asegúrate de que las políticas RLS estén activas:

```sql
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notifications';

-- Ver políticas activas
SELECT * FROM pg_policies 
WHERE tablename = 'notifications';
```

### Paso 6: Probar el Sistema

#### 6.1 Generar Notificaciones de Prueba

Usa el archivo `supabase/test_notifications.sql` para crear notificaciones de ejemplo:

```sql
-- Copiar y ejecutar secciones del archivo test_notifications.sql
-- Reemplazar los UUIDs con valores reales de tu base de datos
```

#### 6.2 Verificar Triggers Automáticos

1. **Crear una nueva tarea** en un módulo → Debe generar notificación `assignment_published`
2. **Crear un nuevo examen** → Debe generar notificación `exam_published`
3. **Agregar un material** → Debe generar notificación `material_published`
4. **Registrar un pago** → Debe generar notificación `pago_confirmado`

#### 6.3 Probar la Verificación de Pagos Pendientes

```sql
-- Ejecutar manualmente la función
SELECT check_pending_payments();

-- Debería retornar el número de notificaciones creadas
```

---

## 🔧 Configuración Adicional

### Personalizar Horarios de Tareas Programadas

Si necesitas ajustar los horarios de las tareas cron:

```sql
-- Desactivar tarea existente
SELECT cron.unschedule('check-pending-payments-daily');

-- Crear nueva con horario diferente (ejemplo: 8:00 AM)
SELECT cron.schedule(
  'check-pending-payments-daily',
  '0 8 * * *',
  $$SELECT check_pending_payments();$$
);
```

### Configurar Notificaciones en Tiempo Real

El hook `useNotifications` ya incluye suscripciones en tiempo real mediante Supabase Realtime. Para habilitar:

1. En Supabase Dashboard: **Database** → **Replication**
2. Habilita replicación para la tabla `notifications`
3. Las notificaciones aparecerán automáticamente sin refrescar la página

---

## 📊 Monitoreo y Mantenimiento

### Consultas Útiles

```sql
-- Ver notificaciones recientes
SELECT 
  n.*,
  p.full_name
FROM notifications n
JOIN profiles p ON p.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 20;

-- Estadísticas de los últimos 7 días
SELECT * FROM get_notification_stats(7);

-- Ver estudiantes con más notificaciones sin leer
SELECT 
  p.full_name,
  COUNT(*) as no_leidas
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE n.is_read = false
GROUP BY p.full_name
ORDER BY no_leidas DESC;

-- Verificar que los triggers están activos
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_notify%';
```

### Limpiezas Periódicas

Las notificaciones antiguas se limpian automáticamente cada mes (notificaciones leídas con más de 6 meses). Para limpiar manualmente:

```sql
DELETE FROM notifications 
WHERE is_read = true 
  AND created_at < NOW() - INTERVAL '6 months';
```

---

## 🐛 Solución de Problemas

### Problema: No se generan notificaciones automáticas

**Solución:**
1. Verificar que los triggers están activos:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%notify%';
```

2. Verificar logs de errores en Supabase
3. Asegurarse de que la tabla objetivo (assignments, exams, materials) tiene el campo `modulo_id`

### Problema: Las notificaciones no aparecen en tiempo real

**Solución:**
1. Verificar que Realtime está habilitado para la tabla `notifications`
2. Revisar la consola del navegador para errores de WebSocket
3. Verificar políticas RLS - deben permitir SELECT para el usuario

### Problema: Tareas programadas no se ejecutan

**Solución:**
1. Verificar que pg_cron está habilitado
2. Revisar que las tareas están activas:
```sql
SELECT * FROM cron.job WHERE active = true;
```
3. Ver logs de ejecución:
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🎨 Personalización Visual

### Cambiar Colores de Badges

Edita `src/components/Notifications.tsx` en la función `getNotificationBadge()`:

```tsx
case 'assignment_published':
  return <Badge className="bg-blue-500">Nueva Tarea</Badge>;
  // Cambiar bg-blue-500 por el color deseado
```

### Cambiar Iconos

Edita `src/components/Notifications.tsx` en la función `getNotificationIcon()`:

```tsx
case 'exam_published':
  return <GraduationCap className="h-5 w-5 text-purple-500" />;
  // Cambiar el icono importado de lucide-react
```

---

## 📈 Métricas y Analytics

Para implementar analytics sobre el uso de notificaciones:

```sql
-- Tasa de lectura por tipo de notificación
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_read = true) as leidas,
  ROUND(
    COUNT(*) FILTER (WHERE is_read = true)::DECIMAL / 
    COUNT(*)::DECIMAL * 100, 
    2
  ) as tasa_lectura_porcentaje
FROM notifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY tasa_lectura_porcentaje DESC;

-- Tiempo promedio de lectura
SELECT 
  type,
  AVG(
    EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600
  )::NUMERIC(10,2) as horas_promedio_lectura
FROM notifications
WHERE is_read = true
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY horas_promedio_lectura;
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutar migración `20260205000000_update_notifications_system.sql`
- [ ] Ejecutar migración `20260205000001_notifications_rls_and_cron.sql`
- [ ] Habilitar extensión `pg_cron` en Supabase
- [ ] Agregar `NotificationBell` al navbar
- [ ] Agregar ruta `/notifications` en el router
- [ ] Verificar políticas RLS
- [ ] Habilitar Realtime para tabla `notifications`
- [ ] Probar creación de tarea → notificación
- [ ] Probar creación de examen → notificación
- [ ] Probar creación de material → notificación
- [ ] Probar registro de pago → notificación
- [ ] Ejecutar `check_pending_payments()` manualmente
- [ ] Verificar tareas cron programadas
- [ ] Generar notificaciones de prueba
- [ ] Revisar que aparecen en el badge del navbar
- [ ] Probar marcado como leída
- [ ] Probar filtros en página de notificaciones

---

## 📞 Soporte

Si encuentras problemas durante la implementación:

1. Revisa los logs en Supabase Dashboard → Logs
2. Verifica las consultas SQL en SQL Editor
3. Revisa la consola del navegador para errores de JavaScript
4. Consulta la documentación completa en `SISTEMA_NOTIFICACIONES_README.md`

---

## 🚀 Próximos Pasos

Una vez implementado el sistema básico, considera:

1. **Notificaciones Push**: Integrar con un servicio como Firebase Cloud Messaging
2. **Emails**: Configurar Supabase Edge Functions para enviar resúmenes por email
3. **Preferencias de Usuario**: Permitir que los usuarios configuren qué notificaciones recibir
4. **Notificaciones de Escritorio**: Usar la API de Notifications del navegador
5. **Agrupación Inteligente**: Agrupar notificaciones similares
6. **Prioridades**: Implementar niveles de prioridad (alta, media, baja)

