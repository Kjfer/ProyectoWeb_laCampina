# 🔔 Sistema de Notificaciones - Peri Institute

## 📋 Descripción General

Sistema completo de notificaciones automáticas integrado con el modelo de negocio de Peri Institute. El sistema notifica a los estudiantes sobre eventos importantes relacionados con sus cursos, exámenes, materiales y pagos.

---

## 🎯 Tipos de Notificaciones

### 📝 Tareas (Assignments)
- **`assignment_published`**: Nueva tarea publicada en un módulo
- **`assignment_due_soon`**: Tarea próxima a vencer (implementar recordatorio)
- **`assignment_overdue`**: Tarea vencida sin entregar

### 📚 Exámenes
- **`exam_published`**: Nuevo examen disponible
- **`exam_due_soon`**: Examen próximo a vencer (implementar recordatorio)
- **`exam_graded`**: Examen calificado y disponible

### 📖 Materiales y Recursos
- **`material_published`**: Nuevo material agregado al módulo
- **`material_updated`**: Material existente actualizado
- **`resource_available`**: Nuevo recurso disponible

### 💰 Pagos
- **`pago_pendiente`**: Pago inicial pendiente
- **`recordatorio_pago`**: Recordatorio de saldo pendiente
- **`pago_vencido`**: Fecha de pago vencida
- **`pago_confirmado`**: Pago registrado exitosamente
- **`material_pago_pendiente`**: Material (book/kit) con pago pendiente
- **`material_acceso_bloqueado`**: Acceso bloqueado por falta de pago

### 🔔 Sistema
- **`general`**: Notificaciones generales
- **`announcement`**: Anuncios importantes

---

## 🔄 Triggers Automáticos

### 1. Nueva Tarea Publicada
```sql
trigger_notify_assignment_published
```
**Se activa cuando:**
- Se inserta una nueva tarea
- Se actualiza una tarea de no publicada a publicada

**Notifica a:** Todos los estudiantes activos del módulo

**Metadata incluida:**
- Título de la tarea
- Fecha de entrega
- Nombre del módulo
- Nombre del curso

---

### 2. Nuevo Examen Publicado
```sql
trigger_notify_exam_published
```
**Se activa cuando:**
- Se inserta un nuevo examen
- Se actualiza un examen de no publicado a publicado

**Notifica a:** Todos los estudiantes activos del módulo

**Metadata incluida:**
- Título del examen
- Fecha límite
- Nombre del módulo
- Nombre del curso
- Duración en minutos

---

### 3. Nuevo Material Publicado
```sql
trigger_notify_material_published
```
**Se activa cuando:**
- Se inserta un nuevo material en un módulo

**Notifica a:** Todos los estudiantes activos del módulo

**Metadata incluida:**
- Título del material
- Tipo de material
- Nombre del módulo
- Nombre del curso

---

### 4. Registro de Pago
```sql
trigger_notify_payment_status
```
**Se activa cuando:**
- Se registra un nuevo pago en el sistema

**Notifica a:** El estudiante asociado al pago

**Acciones:**
- Confirma pago de matrícula (primera cuota o cuotas restantes)
- Confirma pago de materiales (kits/books)
- Desbloquea acceso a recursos si aplica

---

## 📊 Estructura de la Tabla

```sql
notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  type TEXT (ver tipos arriba),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  
  -- Referencias opcionales
  assignment_id UUID REFERENCES assignments(id),
  modulo_id UUID REFERENCES modulos(id),
  exam_id UUID REFERENCES exams(id),
  material_id UUID REFERENCES materials(id),
  pago_id UUID REFERENCES pagos(id),
  matricula_id UUID REFERENCES matriculas(id),
  
  -- Metadata adicional en JSON
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

## 🛠️ Funciones Disponibles

### 1. `create_notification()`
Función helper para crear notificaciones de forma consistente.

**Parámetros:**
```sql
p_user_id UUID,
p_type TEXT,
p_message TEXT,
p_assignment_id UUID DEFAULT NULL,
p_modulo_id UUID DEFAULT NULL,
p_exam_id UUID DEFAULT NULL,
p_material_id UUID DEFAULT NULL,
p_pago_id UUID DEFAULT NULL,
p_matricula_id UUID DEFAULT NULL,
p_metadata JSONB DEFAULT '{}'
```

**Ejemplo de uso:**
```sql
SELECT create_notification(
  'user-uuid-123',
  'announcement',
  'Recuerda revisar los nuevos materiales del curso',
  NULL, -- assignment_id
  'modulo-uuid-456', -- modulo_id
  NULL, -- exam_id
  NULL, -- material_id
  NULL, -- pago_id
  NULL, -- matricula_id
  '{"prioridad": "alta"}'::jsonb
);
```

---

### 2. `notify_modulo_students()`
Notifica a todos los estudiantes activos de un módulo.

**Parámetros:**
```sql
p_modulo_id UUID,
p_type TEXT,
p_message TEXT,
p_assignment_id UUID DEFAULT NULL,
p_exam_id UUID DEFAULT NULL,
p_material_id UUID DEFAULT NULL,
p_metadata JSONB DEFAULT '{}'
```

**Ejemplo de uso:**
```sql
-- Notificar a todos los estudiantes de un módulo sobre un anuncio
SELECT notify_modulo_students(
  'modulo-uuid-789',
  'announcement',
  'Clase suspendida el próximo lunes',
  NULL,
  NULL,
  NULL,
  '{"fecha_afectada": "2026-02-10"}'::jsonb
);
```

---

### 3. `check_pending_payments()`
Verifica pagos pendientes y genera notificaciones de recordatorio.

**Ejecutar:** Diariamente mediante cron job o tarea programada

**Lógica:**
1. Busca matrículas con saldo pendiente (últimos 6 meses)
2. Busca materiales con pago pendiente
3. Crea notificaciones de recordatorio si no se notificó en los últimos 7 días
4. Retorna el número de notificaciones creadas

**Ejemplo de uso:**
```sql
-- Ejecutar verificación diaria
SELECT check_pending_payments();
```

**Programación recomendada (pg_cron):**
```sql
-- Ejecutar todos los días a las 9:00 AM
SELECT cron.schedule(
  'check-pending-payments',
  '0 9 * * *',
  $$SELECT check_pending_payments();$$
);
```

---

## 📱 Componente Frontend

El componente `Notifications.tsx` maneja:

### Características
- ✅ Visualización de notificaciones con iconos y badges diferenciados
- ✅ Marcar individual como leída
- ✅ Marcar todas como leídas
- ✅ Enlaces contextuales según el tipo de notificación
- ✅ Información adicional de metadata
- ✅ Contador de no leídas
- ✅ Ordenamiento por fecha (más recientes primero)

### Navegación Contextual
- **Tareas**: Redirige a `/assignments`
- **Exámenes**: Redirige a `/exams`
- **Materiales**: Redirige a `/courses`
- **Pagos**: Muestra información y toast con instrucciones

---

## 🎨 Estilos Visuales

### Iconos por Tipo
- 📝 Tareas: `FileText` (azul)
- 🎓 Exámenes: `GraduationCap` (morado)
- 📚 Materiales: `BookOpen` / `Package` (cyan)
- 💰 Pagos: `DollarSign` (naranja/verde/rojo según estado)
- 🔔 Sistema: `Bell` (primario)
- ⚠️ Alertas: `AlertCircle` (naranja/rojo)
- ✅ Confirmaciones: `CheckCircle` (verde)

### Badges por Categoría
- **Azul**: Nuevas tareas
- **Morado**: Nuevos exámenes
- **Cyan**: Nuevos materiales
- **Verde**: Confirmaciones y calificaciones
- **Naranja**: Advertencias y recordatorios
- **Rojo**: Vencimientos y bloqueos

---

## 🔐 Seguridad y Permisos

### RLS (Row Level Security)
Asegúrate de tener las políticas RLS configuradas:

```sql
-- Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el sistema puede insertar notificaciones
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Los usuarios pueden actualizar sus notificaciones (marcar como leídas)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 📈 Métricas y Monitoreo

### Consultas Útiles

**Notificaciones no leídas por usuario:**
```sql
SELECT 
  p.full_name,
  COUNT(*) as unread_count
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE n.is_read = false
GROUP BY p.full_name
ORDER BY unread_count DESC;
```

**Tipos de notificaciones más comunes:**
```sql
SELECT 
  type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count
FROM notifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY count DESC;
```

**Eficiencia de lectura:**
```sql
SELECT 
  type,
  AVG(EXTRACT(EPOCH FROM (
    CASE 
      WHEN is_read THEN 
        LEAST(updated_at, created_at + INTERVAL '7 days') - created_at
    END
  ))) / 3600 as avg_hours_to_read
FROM notifications
WHERE is_read = true
GROUP BY type;
```

---

## 🚀 Próximas Mejoras

### Sugerencias
1. **Notificaciones Push**: Integrar con servicio de push notifications
2. **Email**: Enviar resumen diario por correo
3. **Prioridades**: Agregar niveles de prioridad (alta, media, baja)
4. **Agrupación**: Agrupar notificaciones similares
5. **Preferencias**: Permitir a usuarios configurar qué notificaciones recibir
6. **Recordatorios inteligentes**: 
   - Tareas 24h antes de vencer
   - Exámenes 48h antes de vencer
   - Pagos 5 días antes de vencer
7. **Notificaciones en tiempo real**: WebSockets para notificaciones instantáneas

---

## 📞 Soporte

Para dudas o problemas con el sistema de notificaciones:
1. Revisar logs en Supabase
2. Verificar que los triggers estén activos
3. Comprobar políticas RLS
4. Verificar que `check_pending_payments()` se ejecute diariamente

