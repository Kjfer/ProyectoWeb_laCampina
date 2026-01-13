# Eliminación de Aulas Virtuales - Documentación

## Cambios Realizados

Se ha eliminado completamente la funcionalidad de "Aulas Virtuales" del sistema. A continuación se detallan todos los cambios realizados:

### 1. Archivos Eliminados

#### Páginas:
- `src/pages/VirtualClassrooms.tsx`
- `src/pages/VirtualClassroomDetail.tsx`
- `src/pages/VirtualClassroomCourses.tsx`

#### Componentes:
- `src/components/virtual-classrooms/` (carpeta completa con todos los componentes)
  - AttendanceHistory.tsx
  - BulkStudentEnrollment.tsx
  - ClassroomCourses.tsx
  - ClassroomCoursesList.tsx
  - ClassroomStudents.tsx
  - DeleteClassroomDialog.tsx
  - EditClassroomDialog.tsx
  - StudentClassroomCourses.tsx
  - VirtualClassroomAttendance.tsx

#### Funciones de Supabase:
- `supabase/functions/create-virtual-classroom/`
- `supabase/functions/delete-virtual-classroom/`
- `supabase/functions/update-virtual-classroom/`
- `supabase/functions/get-virtual-classrooms/`

#### Documentación y Scripts:
- `ATTENDANCE_SYSTEM.md`
- `install-attendance-system.bat`
- `install-attendance-system.sh`

### 2. Archivos Actualizados

#### src/App.tsx
- ✅ Eliminados imports de VirtualClassrooms, VirtualClassroomDetail, VirtualClassroomCourses
- ✅ Eliminadas rutas `/virtual-classrooms`, `/virtual-classrooms/:id`, `/virtual-classrooms/:id/courses`

#### src/utils/roleNavigation.ts
- ✅ Eliminada entrada "Aulas Virtuales" del menú principal
- ✅ Eliminada entrada "Aulas Virtuales" del menú de administración

#### src/components/layout/AppSidebar.tsx
- ✅ Cambiado texto "Aula Virtual" por "Sistema Educativo"

#### index.html
- ✅ Actualizado título de "Aula Virtual" a "Sistema Educativo"
- ✅ Actualizados meta tags y descripciones

### 3. Refactorizaciones Importantes

#### src/pages/TutorDashboard.tsx
**Antes:** Trabajaba con `virtual_classrooms` tabla
**Ahora:** Trabaja directamente con cursos usando `course_teachers` tabla

Cambios principales:
- Obtiene cursos donde el usuario es tutor mediante la tabla `course_teachers` con `is_tutor = true`
- Agrupa estudiantes de todos los cursos donde es tutor
- Selector de cursos en lugar de selector de aulas virtuales
- Mantiene toda la funcionalidad de seguimiento de asistencia y calificaciones

#### src/pages/AdminBulkStudentImport.tsx
**Antes:** Mostraba aulas virtuales para importación
**Ahora:** Muestra cursos activos

Cambios principales:
- Selector de cursos en lugar de aulas virtuales
- Importación de estudiantes directamente a cursos
- Mantiene funcionalidad completa de importación masiva

#### src/components/students/BulkStudentImport.tsx
**Antes:** Interface `VirtualClassroom`
**Ahora:** Interface `Course`

Cambios:
- Actualizada interfaz para trabajar con cursos
- Funcionalidad sin cambios

#### src/pages/CourseDetail.tsx
- ✅ Eliminada relación con `virtual_classrooms` en la consulta de curso
- ✅ Removido campo `classroom` de la query

#### src/components/course/CourseScheduleManager.tsx
**Antes:** Verificaba permisos consultando `virtual_classrooms.tutor_id`
**Ahora:** Verifica permisos directamente en `course_teachers` tabla

Cambios:
- Permiso de edición basado en `course_teachers.is_tutor`
- Más directo y eficiente

### 4. Base de Datos - ⚠️ IMPORTANTE

#### Tabla `virtual_classrooms`
Esta tabla **AÚN EXISTE** en la base de datos de Supabase. Los cambios realizados eliminan todas las referencias de código, pero la tabla persiste en la base de datos.

**Recomendaciones:**

1. **Antes de eliminar la tabla**, asegúrate de:
   - Hacer backup de los datos si es necesario
   - Verificar que no hay otras dependencias no documentadas
   - Revisar las foreign keys que apuntan a esta tabla

2. **Columnas en otras tablas que aún referencian `virtual_classrooms`:**
   - `courses.classroom_id` (puede ser NULL o eliminarse)
   - `attendance.classroom_id` (puede ser NULL o eliminarse)

3. **Para eliminar completamente la funcionalidad:**

```sql
-- Paso 1: Eliminar foreign keys que apuntan a virtual_classrooms
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_classroom_id_fkey;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_classroom_id_fkey;

-- Paso 2: Opcional - Eliminar columnas
ALTER TABLE courses DROP COLUMN IF EXISTS classroom_id;
ALTER TABLE attendance DROP COLUMN IF EXISTS classroom_id;

-- Paso 3: Eliminar la tabla
DROP TABLE IF EXISTS virtual_classrooms CASCADE;
```

#### Archivos de Tipos (src/integrations/supabase/types.ts)
Este archivo es **autogenerado** por Supabase. Aún contiene referencias a `virtual_classrooms` porque la tabla existe en la base de datos.

**Para regenerar los tipos:**
1. Elimina la tabla `virtual_classrooms` de Supabase (si decides hacerlo)
2. Ejecuta: `npx supabase gen types typescript --project-id [TU_PROJECT_ID] > src/integrations/supabase/types.ts`

### 5. Sistema de Tutoría - Nueva Arquitectura

#### Antes:
```
Tutor → Aula Virtual → Cursos → Estudiantes
```

#### Ahora:
```
Tutor → Cursos (course_teachers.is_tutor = true) → Estudiantes
```

#### Cómo asignar un tutor a un curso:

```sql
INSERT INTO course_teachers (course_id, teacher_id, is_tutor)
VALUES ('course-uuid', 'teacher-uuid', true);
```

O mediante la interfaz administrativa de gestión de cursos.

### 6. Migración de Datos Existentes

Si tienes datos en `virtual_classrooms` y quieres migrarlos al nuevo sistema:

```sql
-- Asignar tutores de aulas virtuales como tutores de curso
INSERT INTO course_teachers (course_id, teacher_id, is_tutor)
SELECT 
    c.id as course_id,
    vc.tutor_id as teacher_id,
    true as is_tutor
FROM courses c
INNER JOIN virtual_classrooms vc ON c.classroom_id = vc.id
WHERE vc.tutor_id IS NOT NULL
ON CONFLICT (course_id, teacher_id) DO UPDATE SET is_tutor = true;
```

### 7. Funcionalidades Mantenidas

✅ **Dashboard de Tutoría**
- Visualización de estadísticas de estudiantes
- Seguimiento de asistencia
- Análisis de calificaciones
- Identificación de estudiantes en riesgo
- Gestión de horarios

✅ **Importación Masiva**
- Importación de estudiantes vía Excel
- Validación de datos
- Matriculación automática

✅ **Gestión de Cursos**
- Todas las funcionalidades de cursos se mantienen
- Sistema de permisos actualizado

### 8. Verificación Post-Cambios

Para verificar que todo funciona correctamente:

1. **Como Tutor:**
   - Iniciar sesión con usuario tutor
   - Verificar que aparece el Dashboard de Tutoría
   - Confirmar que se muestran los cursos asignados
   - Revisar estadísticas de estudiantes

2. **Como Administrador:**
   - Acceder a Importación Masiva
   - Verificar que se muestran cursos activos
   - Probar importación de estudiantes

3. **Base de Datos:**
   ```sql
   -- Verificar tutores asignados
   SELECT 
       c.name as curso,
       c.code as codigo,
       p.first_name || ' ' || p.last_name as tutor
   FROM course_teachers ct
   INNER JOIN courses c ON ct.course_id = c.id
   INNER JOIN profiles p ON ct.teacher_id = p.id
   WHERE ct.is_tutor = true;
   ```

## Notas Finales

- ✅ Todos los archivos de código han sido actualizados
- ✅ No hay errores de compilación
- ⚠️ La tabla `virtual_classrooms` aún existe en la base de datos
- ⚠️ Los tipos de Supabase aún incluyen referencias a la tabla (se actualizarán al regenerar)
- ✅ La funcionalidad de tutoría se ha migrado exitosamente a trabajar con cursos
- ✅ Todas las características importantes se mantienen funcionando

## Fecha de Cambios
13 de enero de 2026
