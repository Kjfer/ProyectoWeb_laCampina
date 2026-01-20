# Fix: Errores 401 en Reportes y Gestión de Pagos

## Problemas Identificados

### 1. Error 401 en Reporte de Asistencia (get-course-class-dates)

Al intentar acceder al reporte de asistencia como administrador y seleccionar un curso, se producía un error 401 al cargar las fechas disponibles.

### 2. Error 401 en Módulo de Actualización de Estado de Pago (toggle-course-access)

Al intentar cambiar el estado de pago de un estudiante, aparecía un error 401 que impedía actualizar el estado.

## Causas

### Problema 1: Políticas RLS faltantes en tabla `attendance`

Las políticas RLS (Row Level Security) de la tabla `attendance` no incluían permisos para que los administradores pudieran consultar los registros de asistencia. Las políticas existentes solo permitían:

1. **Estudiantes**: Ver su propia asistencia
2. **Profesores**: Gestionar asistencia de sus cursos
3. **Padres**: Ver asistencia de sus hijos

Faltaba una política para **administradores**.

### Problema 2: Nombre incorrecto de tabla en función Edge

La función `toggle-course-access/index.ts` estaba usando el nombre de tabla `enrollments`, pero el nombre correcto en la base de datos es `course_enrollments`.

```typescript
// ❌ INCORRECTO
.from('enrollments')

// ✅ CORRECTO
.from('course_enrollments')
```

## Soluciones Implementadas

### Solución 1: Agregar políticas RLS para administradores en tabla `attendance`

Se creó la migración `20260120000000_add_admin_attendance_policy.sql` que agrega dos políticas RLS:

```sql
-- Política de Lectura
CREATE POLICY "Admins can view all attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Política de Gestión Completa
CREATE POLICY "Admins can manage all attendance" ON public.attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );
```

### Solución 2: Corregir nombre de tabla en función Edge

Se corrigió el archivo `supabase/functions/toggle-course-access/index.ts` para usar el nombre correcto de la tabla:

```typescript
const { data: updatedEnrollment, error: updateError } = await supabaseClient
  .from('course_enrollments')  // ✅ Nombre correcto
  .update({
    payment_status,
    payment_verified_by: profile.id,
    payment_verified_at: new Date().toISOString(),
    payment_notes: notes || null,
  })
  .eq('id', enrollment_id)
  ...
```

## Aplicar las Correcciones

### 1. Aplicar migración de base de datos

Para aplicar la migración de políticas RLS en la base de datos:

**Opción A - Con Supabase CLI:**
```bash
cd c:\periIntranet\ProyectoWeb_laCampina
supabase db push
```

**Opción B - Manual en Supabase Dashboard:**
1. Ve a tu proyecto en Supabase Dashboard
2. Ve a la sección "SQL Editor"
3. Copia y ejecuta el contenido de `supabase/migrations/20260120000000_add_admin_attendance_policy.sql`

### 2. Redesplegar función Edge

Después de corregir el código, redesplegar la función:

```bash
cd c:\periIntranet\ProyectoWeb_laCampina
npx supabase functions deploy toggle-course-access
```

Si tienes problemas de autenticación, primero inicia sesión:

```bash
npx supabase login
```

## Verificación

### Verificar Reporte de Asistencia

1. Inicia sesión como administrador
2. Ve a la sección de **Reporte de Asistencia**
3. Selecciona un curso
4. Verifica que las fechas se carguen correctamente sin error 401

### Verificar Gestión de Pagos

1. Inicia sesión como administrador
2. Ve al módulo de **Gestión de Estudiantes** o **Control de Acceso por Pagos**
3. Intenta cambiar el estado de pago de un estudiante
4. Verifica que el cambio se realice correctamente sin error 401

## Archivos Modificados

- **Nueva migración**: `supabase/migrations/20260120000000_add_admin_attendance_policy.sql`
- **Función Edge corregida**: `supabase/functions/toggle-course-access/index.ts`

## Notas Técnicas

### Sobre RLS y Funciones Edge

- Las funciones Edge validan permisos a nivel de aplicación (verificando el rol del usuario)
- Las políticas RLS se evalúan automáticamente en todas las consultas SQL, **incluso desde funciones Edge**
- Esto crea una **doble capa de seguridad**:
  1. La función Edge verifica que el usuario sea admin
  2. Las políticas RLS verifican nuevamente al ejecutar la consulta SQL

### Sobre las Políticas Existentes

La tabla `course_enrollments` ya tiene la política correcta:

```sql
CREATE POLICY "Admins can manage all enrollments" ON public.course_enrollments
  FOR ALL USING (public.has_role('admin'::user_role));
```

Esto permite a los administradores realizar cualquier operación (SELECT, INSERT, UPDATE, DELETE) sobre las matrículas.

## Comandos de Diagnóstico

Si sigues teniendo problemas, puedes verificar:

### 1. Verificar políticas RLS activas

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('attendance', 'course_enrollments')
ORDER BY tablename, policyname;
```

### 2. Verificar rol del usuario

```sql
SELECT p.id, p.user_id, p.role, p.email
FROM profiles p
WHERE p.email = 'gary.fernandez.r@uni.pe';
```

### 3. Verificar funciones Edge desplegadas

```bash
npx supabase functions list
```
