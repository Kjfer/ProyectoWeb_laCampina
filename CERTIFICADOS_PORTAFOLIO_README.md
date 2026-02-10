# Sistema de Certificados vinculado a Portafolios

## 📋 Descripción General

Este sistema implementa un flujo automático donde **solo los estudiantes que entregaron su portafolio final** pueden recibir certificados. Esto garantiza que únicamente los estudiantes que completaron todos los requisitos del curso aparezcan en la lista de certificados.

## 🔄 Flujo del Sistema

```
1. Estudiante entrega portafolio
   ↓
2. Se registra en edition_portfolio_submissions
   ↓
3. TRIGGER automático crea registro en certificate_logs (estado: pending)
   ↓
4. Estudiante aparece en la lista de certificados
   ↓
5. Administrador selecciona estudiantes y envía certificados vía n8n
   ↓
6. Estado actualiza a 'sent' o 'failed'
```

## 🗄️ Estructura de Base de Datos

### Tabla: `edition_portfolios`
Almacena la configuración del portafolio para cada edición de curso.

```sql
CREATE TABLE edition_portfolios (
  id uuid PRIMARY KEY,
  edition_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone NOT NULL,
  template_file_path text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
```

**Campos importantes:**
- `edition_id`: ID del curso (edición) al que pertenece este portafolio
- `title`: Título del portafolio (ej: "Portafolio Final")
- `due_date`: Fecha límite de entrega
- `template_file_path`: Ruta del archivo plantilla en Supabase Storage

### Tabla: `edition_portfolio_submissions`
Registra las entregas de portafolios por estudiante.

```sql
CREATE TABLE edition_portfolio_submissions (
  id uuid PRIMARY KEY,
  portfolio_id uuid REFERENCES edition_portfolios(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  status text DEFAULT 'submitted',
  grade text,
  feedback text,
  submitted_at timestamp with time zone DEFAULT now(),
  graded_at timestamp with time zone,
  UNIQUE(portfolio_id, student_id)
);
```

**Estados:**
- `submitted`: Portafolio enviado, pendiente de revisión
- `graded`: Portafolio revisado y calificado

**Constraint UNIQUE:** Un estudiante solo puede tener una entrega por portafolio (puede actualizarla con upsert)

### Tabla: `certificate_logs`
Registro de certificados pendientes y enviados.

```sql
CREATE TABLE certificate_logs (
  id uuid PRIMARY KEY,
  course_id uuid NOT NULL,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at timestamp with time zone DEFAULT now(),
  status text NOT NULL,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);
```

**Estados:**
- `pending`: Estudiante entregó portafolio, certificado pendiente de envío
- `sent`: Certificado enviado exitosamente
- `failed`: Error al enviar certificado

**Filtro importante:**
- La vista de administración **solo muestra registros con status='pending'**
- Al enviar certificados a n8n, el status cambia a 'sent' o 'failed'
- Los estudiantes enviados **desaparecen de la lista** (ya no son 'pending')
- Esto evita reenvíos accidentales y mantiene la lista limpia

## ⚙️ Trigger Automático

### `trigger_auto_register_certificate`

Este trigger se ejecuta automáticamente cuando un estudiante entrega su portafolio.

**Función:** `auto_register_certificate_from_portfolio()`

```sql
CREATE TRIGGER trigger_auto_register_certificate
  AFTER INSERT ON edition_portfolio_submissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_register_certificate_from_portfolio();
```

**¿Qué hace?**
1. Obtiene el `edition_id` desde `edition_portfolios`
2. Crea un registro en `certificate_logs` con:
   - `course_id`: ID de la edición
   - `student_id`: ID del estudiante
   - `status`: 'pending'
   - `metadata`: Información de la entrega

**Prevención de duplicados:**
- Usa `ON CONFLICT DO NOTHING` para evitar crear múltiples registros si el estudiante actualiza su entrega

## 🖥️ Interfaz de Administración

### Página: AdminCertificates

**Ubicación:** `/admin/certificates`

**Funcionalidades:**

1. **Selección de Curso**
   - Lista solo cursos activos
   - Muestra información del programa asociado

2. **Lista de Estudiantes**
   - **Solo muestra estudiantes con certificados pendientes (status='pending')**
   - Filtra desde `certificate_logs` excluyendo certificados ya enviados
   - Una vez enviados, desaparecen de la lista (status cambia a 'sent' o 'failed')
   - Muestra estado del certificado:
     - ✅ Enviado (verde) - Ya no aparece en lista principal
     - ❌ Falló (rojo) - Se puede reintentar
     - ⏳ Pendiente (gris) - Disponible para enviar

3. **Envío de Certificados**
   - Selección múltiple de estudiantes
   - Configuración de webhook n8n
   - Envío masivo vía Edge Function
   - **Actualiza** registros existentes (no inserta duplicados)
   - Cambia status de 'pending' a 'sent' o 'failed'

### Cambio clave en el código

**Antes:**
```typescript
// Obtenía todos los estudiantes matriculados
const { data: enrollments } = await supabase
  .from('course_enrollments')
  .select('student_id')
  .eq('course_id', courseId);
```

**Después:**
```typescript
// Solo obtiene estudiantes que entregaron portafolio y con certificados pendientes
const { data: certificateLogs } = await supabase
  .from('certificate_logs')
  .select('student_id')
  .eq('course_id', courseId)
  .eq('status', 'pending');  // Solo registros pendientes de envío
```

## 📤 Integración con n8n

### Edge Function: `send-certificates`

**Endpoint:** `https://[YOUR_PROJECT].supabase.co/functions/v1/send-certificates`

**Comportamiento:**
1. Valida que el usuario sea administrador
2. Obtiene datos del curso y estudiantes
3. Envía datos a webhook n8n
4. **ACTUALIZA** los registros existentes en `certificate_logs`:
   - Filtra por: `course_id`, `student_id`, y `status='pending'`
   - Cambia status a 'sent' o 'failed'
   - Registra metadata del envío
5. **NO crea registros duplicados** (usa UPDATE, no INSERT)

**Request:**
```json
{
  "course_id": "uuid",
  "student_ids": ["uuid1", "uuid2"],
  "n8n_webhook_url": "https://your-n8n-instance/webhook/certificates"
}
```

**Datos enviados a n8n:**
```json
{
  "student_name": "Juan Pérez",
  "student_email": "juan@example.com",
  "course_name": "Curso de React",
  "course_code": "REACT-2024",
  "program_name": "Desarrollo Web",
  "academic_year": "2024",
  "semester": "1"
}
```

## 🔐 Políticas de Seguridad (RLS)

### `edition_portfolios`

```sql
-- Admins pueden ver todos los portfolios
CREATE POLICY "Admins pueden ver todos los portfolios"
  ON edition_portfolios FOR SELECT
  USING (auth_role() = 'admin');

-- Estudiantes pueden ver portfolios de sus ediciones
CREATE POLICY "Estudiantes pueden ver portfolios de sus ediciones"
  ON edition_portfolios FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM course_enrollments
      WHERE course_id = edition_id
    )
  );
```

### `edition_portfolio_submissions`

```sql
-- Estudiantes pueden insertar/actualizar sus propias entregas
CREATE POLICY "Estudiantes pueden gestionar sus entregas"
  ON edition_portfolio_submissions
  FOR ALL USING (student_id = auth.uid());

-- Admins pueden ver y actualizar todas las entregas
CREATE POLICY "Admins pueden gestionar todas las entregas"
  ON edition_portfolio_submissions
  FOR ALL USING (auth_role() = 'admin');
```

## 📊 Casos de Uso

### Caso 1: Estudiante entrega portafolio

1. Estudiante va a su curso → Sección "Portafolio Final"
2. Carga su archivo PDF
3. Click en "Entregar Portafolio"
4. Sistema:
   - Sube archivo a Supabase Storage (`student-submissions`)
   - Crea registro en `edition_portfolio_submissions`
   - **Trigger automático** crea registro en `certificate_logs`

### Caso 2: Estudiante actualiza su entrega

1. Estudiante vuelve a la sección de portafolio
2. Carga nuevo archivo
3. Sistema usa `UPSERT` (actualiza registro existente)
4. No se crea duplicado en `certificate_logs` (gracias a ON CONFLICT)

### Caso 3: Administrador envía certificados

1. Admin va a `/admin/certificates`
2. Selecciona curso
3. Ve solo estudiantes con certificados pendientes (status='pending')
4. Selecciona estudiantes
5. Configura webhook n8n
6. Click en "Enviar Certificados"
7. Edge Function:
   - Envía datos a n8n
   - **Actualiza** registros en certificate_logs (NO inserta nuevos)
   - Cambia status de 'pending' a 'sent' o 'failed'
8. Estudiantes enviados desaparecen de la lista (ya no son 'pending')

## 🧪 Testing

### Verificar que el trigger funciona

```sql
-- 1. Crear un portafolio de prueba
INSERT INTO edition_portfolios (edition_id, title, due_date)
VALUES ('tu-edition-id', 'Portafolio Test', NOW() + INTERVAL '30 days');

-- 2. Simular entrega de estudiante
INSERT INTO edition_portfolio_submissions (
  portfolio_id, student_id, file_path, file_name
) VALUES (
  'portfolio-id-creado', 'student-id', 'test/path.pdf', 'test.pdf'
);

-- 3. Verificar que se creó el registro en certificate_logs
SELECT * FROM certificate_logs
WHERE student_id = 'student-id'
AND course_id = 'tu-edition-id'
AND status = 'pending';
```

## 🚨 Solución de Problemas

### Problema: Estudiante no aparece en lista de certificados

**Verificar:**
1. ¿El estudiante entregó su portafolio?
   ```sql
   SELECT * FROM edition_portfolio_submissions
   WHERE student_id = 'id-estudiante';
   ```

2. ¿Se creó el registro en certificate_logs?
   ```sql
   SELECT * FROM certificate_logs
   WHERE student_id = 'id-estudiante';
   ```

3. ¿El registro está en estado 'pending'?
   ```sql
   SELECT * FROM certificate_logs
   WHERE student_id = 'id-estudiante'
   AND status = 'pending';
   ```
   **Nota:** Si el status es 'sent' o 'failed', NO aparecerá en la lista

4. ¿El trigger está activo?
   ```sql
   SELECT * FROM pg_trigger
   WHERE tgname = 'trigger_auto_register_certificate';
   ```

### Problema: Estudiante desapareció de la lista después de enviar

**Esto es normal:** 
- La lista solo muestra estudiantes con status='pending'
- Al enviar certificados, el status cambia a 'sent' o 'failed'
- Para ver el historial completo:
  ```sql
  SELECT student_id, status, sent_at, error_message
  FROM certificate_logs
  WHERE course_id = 'tu-course-id'
  ORDER BY sent_at DESC;
  ```

### Problema: Se crean registros duplicados

**Solución:** El trigger tiene `ON CONFLICT DO NOTHING`. Si hay duplicados, verificar:
```sql
-- Ver duplicados
SELECT course_id, student_id, COUNT(*)
FROM certificate_logs
GROUP BY course_id, student_id
HAVING COUNT(*) > 1;
```

## 📝 Migración

**Archivo:** `supabase/migrations/20260209000000_auto_register_certificates_from_portfolios.sql`

Para aplicar en producción:
```bash
# Con Supabase CLI
supabase db push

# O ejecutar manualmente en Supabase Dashboard → SQL Editor
```

## 🎯 Beneficios del Sistema

✅ **Automatizado:** No requiere intervención manual para registrar estudiantes  
✅ **Seguro:** Solo estudiantes con portafolio entregado reciben certificado  
✅ **Trazable:** Historial completo en certificate_logs  
✅ **Escalable:** Trigger se ejecuta automáticamente sin importar el volumen  
✅ **Integrado:** Se conecta naturalmente con el flujo académico existente  

## 📚 Referencias

- [Documentación de Triggers en PostgreSQL](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [n8n Webhooks](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
