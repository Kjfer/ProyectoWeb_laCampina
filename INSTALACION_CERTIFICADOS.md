# 🚀 Guía de Instalación - Sistema de Certificados con Portafolios

## ⚡ Instalación Rápida

### Paso 1: Ejecutar Migración

Tienes dos opciones para ejecutar la migración:

#### Opción A: Usando Supabase CLI (Recomendado)

```powershell
# Navegar al directorio del proyecto
cd c:\periIntranet\ProyectoWeb_laCampina

# Ejecutar la migración
supabase db push
```

#### Opción B: Usando Supabase Dashboard

1. Ir a [Supabase Dashboard](https://app.supabase.com)
2. Seleccionar tu proyecto
3. Click en "SQL Editor" en el menú lateral
4. Click en "New query"
5. Copiar y pegar el contenido de:
   ```
   supabase/migrations/20260209000000_auto_register_certificates_from_portfolios.sql
   ```
6. Click en "Run" o presionar `Ctrl + Enter`

### Paso 2: Verificar Instalación

Ejecuta esta consulta en el SQL Editor:

```sql
-- Verificar que las tablas existen
SELECT 
  'edition_portfolios' as tabla,
  COUNT(*) as registros
FROM edition_portfolios
UNION ALL
SELECT 
  'edition_portfolio_submissions',
  COUNT(*)
FROM edition_portfolio_submissions
UNION ALL
SELECT 
  'certificate_logs',
  COUNT(*)
FROM certificate_logs;

-- Verificar que el trigger existe
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_auto_register_certificate';

-- Verificar que la función existe
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'auto_register_certificate_from_portfolio';
```

**Resultado esperado:**
- ✅ Las tres tablas deben aparecer (aunque tengan 0 registros)
- ✅ El trigger debe aparecer con `tgenabled = 'O'` (enabled)
- ✅ La función debe existir con el código del trigger

### Paso 3: Probar el Sistema

#### Test 1: Crear un portafolio de prueba

```sql
-- 1. Encuentra una edición existente
SELECT id, name FROM courses WHERE is_active = true LIMIT 1;
-- Copia el ID de la edición

-- 2. Crea un portafolio de prueba
INSERT INTO edition_portfolios (
  edition_id,
  title,
  description,
  due_date
) VALUES (
  'TU-EDITION-ID-AQUI', -- Reemplaza con el ID copiado
  'Portafolio de Prueba',
  'Test del sistema automático',
  NOW() + INTERVAL '30 days'
) RETURNING *;
-- Copia el ID del portafolio creado
```

#### Test 2: Simular entrega de estudiante

```sql
-- 1. Encuentra un estudiante matriculado
SELECT p.id, p.first_name, p.last_name
FROM profiles p
INNER JOIN course_enrollments ce ON ce.student_id = p.id
WHERE ce.course_id = 'TU-EDITION-ID-AQUI'
LIMIT 1;
-- Copia el ID del estudiante

-- 2. Simula entrega de portafolio
INSERT INTO edition_portfolio_submissions (
  portfolio_id,
  student_id,
  file_path,
  file_name,
  status
) VALUES (
  'TU-PORTFOLIO-ID-AQUI', -- ID del portafolio creado en Test 1
  'TU-STUDENT-ID-AQUI',   -- ID del estudiante
  'test/prueba.pdf',
  'documento_prueba.pdf',
  'submitted'
) RETURNING *;
```

#### Test 3: Verificar creación automática en certificate_logs

```sql
-- El trigger debe haber creado automáticamente un registro
SELECT 
  cl.*,
  p.first_name,
  p.last_name,
  c.name as course_name
FROM certificate_logs cl
INNER JOIN profiles p ON p.id = cl.student_id
INNER JOIN courses c ON c.id = cl.course_id
WHERE cl.student_id = 'TU-STUDENT-ID-AQUI'
AND cl.course_id = 'TU-EDITION-ID-AQUI'
AND cl.metadata->>'auto_registered' = 'true';
```

**Resultado esperado:**
- ✅ Debe aparecer un registro con `status = 'pending'`
- ✅ El campo `metadata` debe contener `"auto_registered": true`
- ✅ Debe mostrar el nombre del estudiante y del curso

#### Test 4: Limpiar datos de prueba

```sql
-- Eliminar en orden para respetar foreign keys
DELETE FROM certificate_logs 
WHERE metadata->>'auto_registered' = 'true';

DELETE FROM edition_portfolio_submissions 
WHERE file_name = 'documento_prueba.pdf';

DELETE FROM edition_portfolios 
WHERE title = 'Portafolio de Prueba';
```

---

## 🔍 Verificación de Seguridad (RLS)

### Probar políticas RLS

```sql
-- Ver todas las políticas de edition_portfolios
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'edition_portfolios';

-- Ver todas las políticas de edition_portfolio_submissions
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'edition_portfolio_submissions';
```

**Políticas esperadas:**

**edition_portfolios:**
- ✅ "Admins pueden ver todos los portfolios"
- ✅ "Estudiantes pueden ver portfolios de sus ediciones"
- ✅ "Admins pueden insertar portfolios"
- ✅ "Admins pueden actualizar portfolios"

**edition_portfolio_submissions:**
- ✅ "Admins pueden ver todas las entregas"
- ✅ "Estudiantes pueden ver sus propias entregas"
- ✅ "Estudiantes pueden insertar sus entregas"
- ✅ "Estudiantes pueden actualizar sus entregas"
- ✅ "Admins pueden actualizar entregas"

---

## 📱 Verificar en la Interfaz

### 1. Login como Administrador

1. Ve a `/admin/certificates`
2. Deberías ver la página "Gestión de Certificados"
3. El subtítulo debe decir: **"Envía certificados a estudiantes que entregaron su portafolio final"**

### 2. Seleccionar un Curso

1. En el dropdown "Curso", selecciona un curso activo
2. SOLO deben aparecer estudiantes que hayan entregado su portafolio
3. Si no aparece ningún estudiante, es porque nadie ha entregado portafolio aún

### 3. Probar Flujo Completo como Estudiante

1. Login como estudiante
2. Ve a uno de tus cursos
3. Busca la sección "Portafolio Final"
4. Sube un archivo PDF
5. Click en "Entregar Portafolio"
6. Login nuevamente como admin
7. Ve a `/admin/certificates`
8. Selecciona el mismo curso
9. **El estudiante debe aparecer ahora en la lista**

---

## 🐛 Solución de Problemas

### Problema 1: "No se pudieron cargar los estudiantes"

**Causa:** Error en la consulta a `certificate_logs`

**Solución:**
```sql
-- Verificar que la tabla existe y tiene datos
SELECT * FROM certificate_logs LIMIT 5;

-- Si falla, verificar permisos
GRANT SELECT ON certificate_logs TO authenticated;
GRANT SELECT ON certificate_logs TO anon;
```

### Problema 2: "El trigger no se ejecuta"

**Verificar:**
```sql
-- El trigger debe estar habilitado
SELECT tgname, tgenabled FROM pg_trigger 
WHERE tgname = 'trigger_auto_register_certificate';

-- Si está deshabilitado (tgenabled != 'O'):
ALTER TABLE edition_portfolio_submissions 
ENABLE TRIGGER trigger_auto_register_certificate;
```

### Problema 3: "Se crean registros duplicados"

**Causa:** Es posible que el trigger se haya ejecutado antes de agregar `ON CONFLICT DO NOTHING`

**Solución:**
```sql
-- Re-crear la función con ON CONFLICT
DROP FUNCTION IF EXISTS auto_register_certificate_from_portfolio() CASCADE;

-- Luego ejecutar nuevamente la migración completa
```

### Problema 4: "No aparecen estudiantes aunque entregaron portafolio"

**Depurar paso a paso:**

```sql
-- 1. ¿Hay entregas de portafolio?
SELECT COUNT(*) FROM edition_portfolio_submissions;

-- 2. ¿Hay registros en certificate_logs?
SELECT COUNT(*) FROM certificate_logs;

-- 3. ¿Las IDs coinciden?
SELECT 
  eps.student_id,
  ep.edition_id,
  COUNT(cl.id) as registros_en_certificate_logs
FROM edition_portfolio_submissions eps
INNER JOIN edition_portfolios ep ON ep.id = eps.portfolio_id
LEFT JOIN certificate_logs cl ON cl.student_id = eps.student_id 
  AND cl.course_id = ep.edition_id
GROUP BY eps.student_id, ep.edition_id
HAVING COUNT(cl.id) = 0; -- Debería retornar 0 filas

-- 4. Si hay discrepancias, ejecutar manualmente:
INSERT INTO certificate_logs (course_id, student_id, status, metadata)
SELECT 
  ep.edition_id,
  eps.student_id,
  'pending',
  jsonb_build_object(
    'portfolio_submission_id', eps.id,
    'manual_fix', true
  )
FROM edition_portfolio_submissions eps
INNER JOIN edition_portfolios ep ON ep.id = eps.portfolio_id
LEFT JOIN certificate_logs cl ON cl.student_id = eps.student_id 
  AND cl.course_id = ep.edition_id
WHERE cl.id IS NULL;
```

---

## ✅ Checklist de Instalación

- [ ] Migración ejecutada sin errores
- [ ] Tablas creadas: `edition_portfolios`, `edition_portfolio_submissions`
- [ ] Trigger `trigger_auto_register_certificate` existe y está habilitado
- [ ] Función `auto_register_certificate_from_portfolio()` existe
- [ ] Políticas RLS creadas correctamente
- [ ] Test 1: Portafolio de prueba creado
- [ ] Test 2: Entrega simulada exitosa
- [ ] Test 3: Registro automático en `certificate_logs` verificado
- [ ] Test 4: Datos de prueba eliminados
- [ ] Interfaz `/admin/certificates` muestra solo estudiantes con portafolio
- [ ] Flujo completo probado (estudiante entrega → aparece en admin)

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs de Supabase:**
   - Dashboard → Logs → Postgres Logs
   
2. **Ejecuta el diagnóstico:**
   ```sql
   -- Ver últimos errores
   SELECT * FROM pg_stat_statements 
   WHERE query LIKE '%edition_portfolio%' 
   OR query LIKE '%certificate_logs%'
   ORDER BY last_call DESC LIMIT 10;
   ```

3. **Consulta la documentación completa:**
   - [CERTIFICADOS_PORTAFOLIO_README.md](CERTIFICADOS_PORTAFOLIO_README.md)

---

## 🎉 ¡Listo!

El sistema de certificados vinculado a portafolios ya está funcionando. Los estudiantes que entreguen su portafolio automáticamente aparecerán en la lista de certificados.

**Próximos pasos:**
1. Configurar webhook de n8n en `/admin/certificates`
2. Probar envío de certificados en producción
3. Monitorear la tabla `certificate_logs` para métricas

---

**Versión:** 1.0.0  
**Fecha:** 9 de febrero de 2026  
**Migración:** `20260209000000_auto_register_certificates_from_portfolios.sql`
