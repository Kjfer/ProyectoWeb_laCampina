# Sistema de Asistencia por Aula Virtual

## Cambios Implementados

Se ha mejorado el sistema de asistencia para que funcione a nivel de **Aula Virtual** en lugar de por curso individual. Esto permite que los profesores tomen la asistencia una sola vez al día para todos los estudiantes de su aula.

## Características Principales

### 1. **Control de Asistencia Diario**
- Interfaz simple para tomar asistencia de todos los estudiantes del aula
- Solo se puede tomar asistencia una vez al día (apropiado para colegios)
- Estados de asistencia: Presente, Tardanza, Ausente, Justificado
- Observaciones individuales y generales
- Acciones rápidas: marcar todos como presentes/ausentes

### 2. **Historial de Asistencia**
- Vista completa del historial de asistencias por mes
- Filtrado por estudiante o todos los estudiantes
- Estadísticas de asistencia con porcentaje
- Exportación a CSV
- Visualización agrupada por fecha

### 3. **Estadísticas en Tiempo Real**
- Contador de presentes, tardanzas, ausentes y justificados
- Porcentaje de asistencia
- Visualización clara con iconos y colores

## Pasos para Implementar

### 1. Aplicar la Migración de Base de Datos

Ejecuta el siguiente comando en tu terminal desde la carpeta raíz del proyecto:

```bash
npx supabase migration up
```

O si prefieres aplicar manualmente, ejecuta el SQL en el archivo:
```
supabase/migrations/20250924000001_add_classroom_attendance.sql
```

Esto hará lo siguiente:
- Agregar campo `classroom_id` a la tabla `attendance`
- Modificar constraints para permitir asistencia por aula virtual O por curso
- Actualizar políticas RLS para dar acceso a profesores de aulas virtuales
- Crear índices para mejorar el rendimiento

### 2. Desplegar la Función Edge

Ejecuta el siguiente comando para desplegar la nueva función:

```bash
npx supabase functions deploy create-classroom-attendance
```

### 3. Verificar que los Cursos Tengan classroom_id

El sistema obtiene los estudiantes a través de los cursos matriculados. Asegúrate de que la tabla `courses` tenga el campo `classroom_id`:

```sql
-- Verificar si existe la columna
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.virtual_classrooms(id) ON DELETE SET NULL;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_courses_classroom_id ON public.courses(classroom_id);
```

Los estudiantes del aula virtual son aquellos matriculados en cualquier curso que pertenezca a esa aula virtual (a través de `course_enrollments`).

## Uso del Sistema

### Para Profesores:

1. **Tomar Asistencia:**
   - Ve a un Aula Virtual
   - Haz clic en la pestaña "Asistencia"
   - Por defecto, todos los estudiantes están marcados como "Presente"
   - Cambia el estado de los estudiantes según corresponda
   - Agrega observaciones individuales o generales si es necesario
   - Haz clic en "Guardar Asistencia"

2. **Ver Historial:**
   - Ve a un Aula Virtual
   - Haz clic en la pestaña "Historial"
   - Selecciona el mes que deseas consultar
   - Filtra por estudiante específico o ve todos
   - Exporta a CSV si necesitas un reporte

### Para Estudiantes:

- Los estudiantes pueden ver su propio historial de asistencia
- Verán las observaciones dejadas por el profesor
- No pueden modificar los registros

## Validaciones Implementadas

1. **Una asistencia por día:** Solo se puede registrar asistencia una vez al día por aula virtual
2. **Solo el día actual:** Los profesores solo pueden tomar asistencia para el día de hoy
3. **Permisos:** Solo profesores del aula o administradores pueden tomar asistencia
4. **Todos los estudiantes:** Se debe registrar la asistencia de todos los estudiantes antes de guardar

## Archivos Creados/Modificados

### Nuevos Componentes:
- `src/components/virtual-classrooms/VirtualClassroomAttendance.tsx`
- `src/components/virtual-classrooms/AttendanceHistory.tsx`

### Migraciones:
- `supabase/migrations/20250924000001_add_classroom_attendance.sql`

### Funciones Edge:
- `supabase/functions/create-classroom-attendance/index.ts`

### Modificados:
- `src/pages/VirtualClassroomDetail.tsx` - Agregadas pestañas de asistencia e historial

## Notas Técnicas

- La asistencia ahora puede ser por **aula virtual** O por **curso** (no ambos)
- Se mantiene la compatibilidad con el sistema anterior de asistencia por curso
- Los registros antiguos no se ven afectados
- El sistema usa políticas RLS para seguridad a nivel de base de datos
