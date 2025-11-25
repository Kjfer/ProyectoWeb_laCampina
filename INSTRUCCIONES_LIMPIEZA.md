# 🔧 Instrucciones de Limpieza y Corrección

## ⚠️ Situación Actual

Ya aplicaste la migración `create_classroom_students.sql` que creó una tabla `virtual_classroom_students` que **NO se está usando**.

## ✅ Pasos a Seguir

### Opción 1: Limpieza Completa (RECOMENDADO)

Ejecuta el archivo `cleanup_and_fix.sql` en Supabase SQL Editor:

1. Ve a Supabase Dashboard
2. Abre el **SQL Editor**
3. Copia y pega el contenido de `cleanup_and_fix.sql`
4. Haz clic en **Run**

Este script:
- ✅ Elimina la tabla `virtual_classroom_students` (no se usa)
- ✅ Asegura que `courses` tenga `classroom_id`
- ✅ Asegura que `attendance` tenga `classroom_id`
- ✅ Crea todos los índices necesarios
- ✅ Actualiza las políticas RLS
- ✅ Verifica que todo esté correcto

### Opción 2: Solo Aplicar lo Mínimo Necesario

Si prefieres mantener la tabla `virtual_classroom_students` (aunque no se use), ejecuta estos comandos:

```sql
-- 1. Agregar classroom_id a courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS classroom_id UUID 
REFERENCES public.virtual_classrooms(id) ON DELETE SET NULL;

-- 2. Crear índice
CREATE INDEX IF NOT EXISTS idx_courses_classroom_id 
ON public.courses(classroom_id);

-- 3. Verificar
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'courses' AND column_name = 'classroom_id';
```

## 📋 Después de la Limpieza

### 1. Desplegar la función Edge

```bash
npx supabase functions deploy create-classroom-attendance
```

### 2. Asignar cursos a aulas virtuales

Necesitas actualizar tus cursos para que tengan el `classroom_id` correcto.

**Opción A - Manualmente en SQL:**
```sql
-- Por cada curso, asigna su aula virtual
UPDATE courses 
SET classroom_id = 'uuid-del-aula-virtual'
WHERE id = 'uuid-del-curso';
```

**Opción B - Ver qué cursos necesitan asignación:**
```sql
SELECT 
    c.id,
    c.name as curso,
    c.code,
    c.classroom_id,
    CASE 
        WHEN c.classroom_id IS NULL THEN '⚠️ NECESITA AULA'
        ELSE '✅ OK'
    END as estado
FROM courses c
WHERE c.is_active = true
ORDER BY c.classroom_id NULLS FIRST;
```

### 3. Verificar que funcione

1. Ve a un Aula Virtual
2. Pestaña "Asistencia"
3. Deberías ver los estudiantes matriculados en los cursos de esa aula

## 🗑️ Archivos que puedes IGNORAR

Estos archivos ya no son necesarios:
- ❌ `20250924000000_create_classroom_students.sql` (comentado, no hace nada)
- ❌ `install-attendance-system.bat` (desactualizado)
- ❌ `install-attendance-system.sh` (desactualizado)

## ✅ Archivos IMPORTANTES

- ✅ `cleanup_and_fix.sql` - **EJECUTAR PRIMERO**
- ✅ `FIX_ATTENDANCE.md` - Documentación
- ✅ `diagnose_attendance.sql` - Para diagnosticar problemas
- ✅ Componentes corregidos en `src/components/virtual-classrooms/`

## 🎯 Resumen

```
ANTES (❌ INCORRECTO):
Aula Virtual → virtual_classroom_students → Estudiantes

AHORA (✅ CORRECTO):
Aula Virtual → courses (classroom_id) → course_enrollments → Estudiantes
```

---

**¿Dudas?** Ejecuta `diagnose_attendance.sql` para ver el estado actual de tu base de datos.
