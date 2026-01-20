# Seguimiento de Certificados

## Descripción General

El módulo de gestión de certificados ahora incluye un sistema completo de seguimiento que registra cada envío de certificado y muestra su estado en la interfaz administrativa.

## Características

### 1. Registro de Envíos
Cada vez que se envía un certificado a través de n8n, el sistema registra:
- ✅ Estudiante que recibió el certificado
- ✅ Curso asociado
- ✅ Fecha y hora del envío
- ✅ Estado del envío (sent/failed)
- ✅ Mensaje de error (en caso de fallo)
- ✅ Metadatos adicionales (nombre, email, curso, etc.)

### 2. Tabla de Base de Datos

**Tabla: `certificate_logs`**

```sql
CREATE TABLE certificate_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL, -- 'sent' o 'failed'
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Índices:**
- `idx_certificate_logs_course` para consultas por curso
- `idx_certificate_logs_student` para consultas por estudiante
- `idx_certificate_logs_status` para filtros por estado

### 3. Estados de Certificado

Cada estudiante puede tener uno de estos estados:

| Estado | Icono | Color | Descripción |
|--------|-------|-------|-------------|
| **Enviado** | ✓ | Verde | El certificado se envió correctamente a n8n |
| **Fallido** | ✗ | Rojo | Hubo un error al enviar el certificado |
| **Pendiente** | ⏱ | Gris | El certificado aún no ha sido enviado |

### 4. Interfaz de Usuario

#### Vista de Estudiantes
La tabla de estudiantes ahora incluye una columna "Estado" que muestra:
- Icono visual del estado
- Texto descriptivo
- Tooltip con mensaje de error (en caso de fallo)

#### Actualización Automática
Después de enviar certificados, la lista se actualiza automáticamente para reflejar los nuevos estados.

## Flujo de Trabajo

```
1. Admin selecciona curso
   ↓
2. Sistema carga estudiantes matriculados
   ↓
3. Sistema carga historial de certificados enviados
   ↓
4. Interfaz muestra estado de cada estudiante
   ↓
5. Admin selecciona estudiantes a certificar
   ↓
6. Sistema envía datos a n8n
   ↓
7. Sistema registra cada envío en certificate_logs
   ↓
8. Interfaz se actualiza con nuevos estados
```

## Función Edge: send-certificates

### Lógica de Registro

```typescript
// Para cada estudiante
for (const student of students) {
  try {
    // Enviar a n8n
    await fetch(n8n_webhook_url, { ... });
    
    // Registrar éxito
    await supabase.from('certificate_logs').insert({
      course_id,
      student_id: student.id,
      status: 'sent',
      metadata: { ... }
    });
    
  } catch (error) {
    // Registrar fallo
    await supabase.from('certificate_logs').insert({
      course_id,
      student_id: student.id,
      status: 'failed',
      error_message: error.message,
      metadata: { ... }
    });
  }
}
```

### Ventajas
- ✅ Continúa enviando aunque falle alguno
- ✅ Registra todos los intentos
- ✅ Mantiene metadatos para auditoría
- ✅ No interrumpe el proceso por errores individuales

## Consultas SQL Útiles

### Ver todos los certificados enviados a un curso
```sql
SELECT 
  cl.sent_at,
  p.first_name,
  p.paternal_surname,
  p.maternal_surname,
  p.email,
  cl.status,
  cl.error_message
FROM certificate_logs cl
JOIN profiles p ON cl.student_id = p.id
WHERE cl.course_id = 'UUID_DEL_CURSO'
ORDER BY cl.sent_at DESC;
```

### Contar certificados por estado
```sql
SELECT 
  c.name AS curso,
  COUNT(*) FILTER (WHERE cl.status = 'sent') AS enviados,
  COUNT(*) FILTER (WHERE cl.status = 'failed') AS fallidos,
  COUNT(*) AS total
FROM courses c
LEFT JOIN certificate_logs cl ON c.id = cl.course_id
GROUP BY c.id, c.name
ORDER BY c.name;
```

### Estudiantes sin certificado en un curso
```sql
SELECT 
  p.first_name,
  p.paternal_surname,
  p.email
FROM course_enrollments ce
JOIN profiles p ON ce.student_id = p.id
WHERE ce.course_id = 'UUID_DEL_CURSO'
  AND NOT EXISTS (
    SELECT 1 FROM certificate_logs cl
    WHERE cl.student_id = p.id
      AND cl.course_id = ce.course_id
      AND cl.status = 'sent'
  );
```

## Políticas RLS

Las políticas de seguridad permiten:
- ✅ Admins pueden ver todos los logs
- ✅ Admins pueden insertar nuevos logs
- ❌ Usuarios normales no tienen acceso

## Componente Frontend

### Estado
```typescript
interface CertificateLog {
  id: string;
  student_id: string;
  sent_at: string;
  status: 'sent' | 'failed';
  error_message?: string;
}

const [certificateLogs, setCertificateLogs] = useState<CertificateLog[]>([]);
```

### Funciones Clave

#### Cargar Logs
```typescript
const fetchCertificateLogs = async (courseId: string) => {
  const { data } = await supabase
    .from('certificate_logs')
    .select('*')
    .eq('course_id', courseId)
    .order('sent_at', { ascending: false });
  
  setCertificateLogs(data || []);
};
```

#### Obtener Estado
```typescript
const getCertificateStatus = (studentId: string) => {
  const log = certificateLogs.find(log => log.student_id === studentId);
  if (!log) return 'pending';
  return log.status;
};
```

#### Renderizar Estado
```typescript
const renderCertificateStatus = (studentId: string) => {
  const status = getCertificateStatus(studentId);
  // Retorna icono + texto según el estado
};
```

## Despliegue

### Aplicar Migración
```bash
npx supabase db push
```

### Desplegar Función
```bash
npx supabase functions deploy send-certificates
```

### Script Automatizado
```bash
.\deploy-certificates.ps1
```

## Testing

### 1. Envío Exitoso
```bash
# Enviar certificado a un estudiante
# Verificar que aparece con estado "Enviado" (✓)
```

### 2. Envío Fallido
```bash
# Configurar URL webhook incorrecta
# Enviar certificado
# Verificar que aparece con estado "Fallido" (✗) y mensaje de error
```

### 3. Múltiples Envíos
```bash
# Enviar certificados varias veces al mismo estudiante
# Verificar que se muestra el envío más reciente
```

### 4. Filtrado
```bash
# Cambiar de curso
# Verificar que los estados se actualizan correctamente
```

## Mantenimiento

### Limpiar Logs Antiguos
```sql
-- Eliminar logs de más de 1 año
DELETE FROM certificate_logs
WHERE sent_at < NOW() - INTERVAL '1 year';
```

### Reenviar Fallidos
```sql
-- Identificar certificados fallidos para reenvío manual
SELECT 
  p.email,
  c.name,
  cl.error_message
FROM certificate_logs cl
JOIN profiles p ON cl.student_id = p.id
JOIN courses c ON cl.course_id = c.id
WHERE cl.status = 'failed'
  AND cl.sent_at > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Los estados no se muestran
1. Verificar que la migración se aplicó: `SELECT * FROM certificate_logs LIMIT 1;`
2. Verificar políticas RLS para admins
3. Revisar console.log del navegador

### Los certificados se envían pero no se registran
1. Verificar logs de la función Edge
2. Verificar que la función tiene permisos de escritura
3. Revisar errores de inserción en Supabase

### Estados desactualizados
1. El componente llama a `fetchCertificateLogs` después de enviar
2. Verificar que el `useEffect` se ejecuta correctamente
3. Forzar recarga cambiando de curso

## Próximas Mejoras

- [ ] Paginación de logs (cuando haya muchos)
- [ ] Filtro por estado (mostrar solo pendientes/fallidos)
- [ ] Exportar reporte de certificados enviados
- [ ] Notificaciones en tiempo real cuando se envía un certificado
- [ ] Reenvío masivo de certificados fallidos
- [ ] Dashboard con métricas de certificados

## Referencias

- Migración: `supabase/migrations/20260120000001_create_certificate_logs.sql`
- Función Edge: `supabase/functions/send-certificates/index.ts`
- Componente: `src/pages/AdminCertificates.tsx`
- Script: `deploy-certificates.ps1`
