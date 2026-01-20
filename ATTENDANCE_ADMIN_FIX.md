# Fix: Errores 401 en Reportes y Gestión de Pagos

## Problemas Identificados

### 1. Error 401 en Reporte de Asistencia (get-course-class-dates)

Al intentar acceder al reporte de asistencia como administrador y seleccionar un curso, se producía un error 401 al cargar las fechas disponibles.

### 2. Error 401 en Módulo de Actualización de Estado de Pago (toggle-course-access)

Al intentar cambiar el estado de pago de un estudiante, aparecía un error 401 que impedía actualizar el estado.

### 3. Error 401 Persistente Después de Aplicar Correcciones

Si los errores 401 persisten después de aplicar la migración y redesplegar las funciones Edge, probablemente se debe a:
- Usuario no tiene rol 'admin' correctamente configurado en la tabla profiles
- Políticas RLS no aplicadas correctamente
- Problema con la función `has_role()`

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

### Solución 3: Agregar logs detallados para diagnóstico

Se mejoraron ambas funciones Edge con logs detallados que muestran:
- Usuario autenticado (ID y email)
- Perfil encontrado (ID y rol)
- Detalles completos de errores RLS (código, detalles, hints)

### Solución 4: Vista general de Reportes

Se creó la página `AdminReports.tsx` que muestra todos los reportes disponibles en el sistema, no solo el de asistencia.

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

### 2. Redesplegar funciones Edge con logs mejorados

**Script automatizado:**
```powershell
.\redeploy-with-logs.ps1
```

**O manual:**
```bash
npx supabase functions deploy get-course-class-dates
npx supabase functions deploy toggle-course-access
```

### 3. Ejecutar diagnóstico SQL

Si los errores persisten, ejecuta el script de diagnóstico:

1. Abre `supabase/diagnostico-rls-401.sql`
2. Ve a Supabase Dashboard → SQL Editor
3. Reemplaza `gary.fernandez.r@uni.pe` con el email del usuario
4. Ejecuta el script completo
5. Revisa los resultados

## Verificación

### Verificar Reporte de Asistencia

1. Inicia sesión como administrador
2. Ve a **Reportes** en el sidebar
3. Selecciona **Reporte de Asistencia**
4. Selecciona un curso
5. Verifica que las fechas se carguen correctamente sin error 401

### Verificar Gestión de Pagos

1. Inicia sesión como administrador
2. Ve al módulo de **Gestión de Estudiantes**
3. Intenta cambiar el estado de pago de un estudiante
4. Verifica que el cambio se realice correctamente sin error 401

### Revisar Logs en Supabase

1. Ve a Supabase Dashboard → Edge Functions → Logs
2. Busca las funciones `get-course-class-dates` y `toggle-course-access`
3. Revisa los logs detallados que ahora incluyen:
   - ✓ Usuario autenticado: [user_id] [email]
   - ✓ Perfil encontrado - ID: [profile_id] Role: [role]
   - 📊 Consultando asistencias - course_id: [id] user_role: [role]
   - ❌ Error details: [mensaje completo con código y detalles]

## Archivos Creados/Modificados

### Nuevos Archivos
- **Migración**: `supabase/migrations/20260120000000_add_admin_attendance_policy.sql`
- **Página de reportes**: `src/pages/AdminReports.tsx`
- **Script diagnóstico**: `supabase/diagnostico-rls-401.sql`
- **Script redeploy**: `redeploy-with-logs.ps1`

### Archivos Modificados
- **Función Edge**: `supabase/functions/toggle-course-access/index.ts`
- **Función Edge**: `supabase/functions/get-course-class-dates/index.ts`
- **Rutas**: `src/App.tsx`
- **Navegación**: `src/utils/roleNavigation.ts`

## Diagnóstico de Errores Persistentes

Si después de aplicar todas las correcciones sigues viendo errores 401, verifica:

### 1. Verificar Rol del Usuario
```sql
SELECT id, email, role 
FROM profiles 
WHERE email = 'gary.fernandez.r@uni.pe';
```
**Debe retornar**: `role = 'admin'`

### 2. Verificar Políticas RLS Activas
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'attendance' 
  AND policyname ILIKE '%admin%';
```
**Debe retornar**: Las dos políticas creadas

### 3. Probar Función has_role
```sql
SELECT public.has_role('admin'::user_role) as is_admin;
```
**Debe retornar**: `true`

### 4. Ver Logs de Edge Functions
```bash
npx supabase functions logs get-course-class-dates --tail
npx supabase functions logs toggle-course-access --tail
```

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

## Comandos Útiles

### Ver logs en tiempo real
```bash
npx supabase functions logs get-course-class-dates
npx supabase functions logs toggle-course-access
```

### Listar funciones desplegadas
```bash
npx supabase functions list
```

### Verificar estado de migraciones
```bash
npx supabase db diff
```
