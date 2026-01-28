# Instrucciones de Integración - Nuevo Modelo Peri Institute

## 🎯 Pasos para Implementar el Nuevo Modelo

### 1. Ejecutar la Migración SQL

**Opción A: Desde Supabase Dashboard**
1. Ir a Supabase Dashboard → SQL Editor
2. Copiar el contenido de `supabase/migrations/20260127000001_create_peri_institute_model.sql`
3. Ejecutar el script
4. Verificar que no haya errores

**Opción B: Desde CLI de Supabase** 
```bash
supabase db push
```

**Verificación:**
```sql
-- Verificar que las tablas se crearon
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'programas', 
  'modulos', 
  'matriculas', 
  'pagos', 
  'registro_compra_materiales',
  'cursos_grabados',
  'venta_cursos_grabados'
);
```

---

### 2. Agregar Rutas en el Router

Editar el archivo de rutas principal (probablemente `App.tsx` o `main.tsx`):

```typescript
import AdminProgramasManagement from '@/pages/AdminProgramasManagement';
import AdminEdicionesManagement from '@/pages/AdminEdicionesManagement';
import AdminEdicionForm from '@/pages/AdminEdicionForm';
import AdminModulosManagement from '@/pages/AdminModulosManagement';
import AdminMatriculaForm from '@/pages/AdminMatriculaForm';
import AdminPagosManagement from '@/pages/AdminPagosManagement';

// Dentro de las rutas protegidas de admin:
{
  path: '/admin/programas',
  element: <AdminProgramasManagement />
},
{
  path: '/admin/ediciones',
  element: <AdminEdicionesManagement />
},
{
  path: '/admin/ediciones/nueva',
  element: <AdminEdicionForm />
},
{
  path: '/admin/ediciones/:id/editar',
  element: <AdminEdicionForm />
},
{
  path: '/admin/ediciones/:courseId/modulos',
  element: <AdminModulosManagement />
},
{
  path: '/admin/matriculas/nueva',
  element: <AdminMatriculaForm />
},
{
  path: '/admin/pagos',
  element: <AdminPagosManagement />
}
```

---

### 3. Agregar Enlaces en el Menú de Navegación

Editar el componente de navegación del dashboard de admin:

```typescript
// En el menú lateral o navbar del admin
<nav>
  <NavItem to="/admin/programas" icon={<BookOpen />}>
    Programas
  </NavItem>
  <NavItem to="/admin/ediciones" icon={<GraduationCap />}>
    Ediciones
  </NavItem>
  <NavItem to="/admin/matriculas/nueva" icon={<UserPlus />}>
    Nueva Matrícula
  </NavItem>
  <NavItem to="/admin/pagos" icon={<DollarSign />}>
    Gestión de Pagos
  </NavItem>
</nav>
```

---

### 4. Migrar Datos Existentes (si aplica)

Si ya tienes datos en la tabla `courses` antigua, necesitas migrarlos:

```sql
-- Ejemplo: Migrar courses existentes a la nueva estructura
-- NOTA: Ajustar según tus datos reales

-- 1. Crear programas base desde courses existentes
INSERT INTO programas (name, code, description, is_active)
SELECT DISTINCT 
  'Programa ' || LEFT(code, 6) as name,
  LEFT(code, 6) as code,
  'Programa migrado' as description,
  true
FROM courses_old
WHERE is_active = true;

-- 2. Migrar courses con program_id
-- (Requiere lógica manual para asignar program_id correcto)

-- 3. Crear módulos por defecto para cada course
-- (Requiere definir cómo dividir las courses existentes en módulos)
```

**IMPORTANTE:** La migración de datos debe hacerse con cuidado. Se recomienda:
1. Hacer backup de la base de datos
2. Probar en ambiente de desarrollo primero
3. Revisar cada registro migrado

---

### 5. Actualizar Componentes de Estudiante

#### 5.1. Página de Cursos del Estudiante

Crear/actualizar `src/pages/StudentCourses.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CourseWithRelations } from '@/integrations/supabase/peri-types';
import { useAuth } from '@/hooks/useAuth';

export default function StudentCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyCourses();
  }, [user]);

  const fetchMyCourses = async () => {
    if (!user) return;

    try {
      // Obtener el profile del estudiante
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Obtener ediciones donde está inscrito (a través de módulos)
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          modulo_id,
          modulos!inner(
            course_id,
            courses!inner(
              id,
              name,
              code,
              description,
              material,
              programa:programas(name, code)
            )
          )
        `)
        .eq('student_id', profile.id)
        .eq('is_active', true);

      if (error) throw error;

      // Agrupar por edición única
      const uniqueCourses = new Map();
      data?.forEach(enrollment => {
        const course = enrollment.modulos.courses;
        if (!uniqueCourses.has(course.id)) {
          uniqueCourses.set(course.id, course);
        }
      });

      setCourses(Array.from(uniqueCourses.values()));
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Mis Cursos</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(course => (
          <Card key={course.id}>
            <CardHeader>
              <CardTitle>{course.name}</CardTitle>
              <CardDescription>{course.programa?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{course.code}</p>
              <Button 
                className="mt-4 w-full"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                Ver Módulos
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### 5.2. Vista de Módulos de una Edición

Crear `src/pages/StudentCourseDetail.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Course, Modulo } from '@/integrations/supabase/peri-types';
import { useAuth } from '@/hooks/useAuth';

export default function StudentCourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [hasBookAccess, setHasBookAccess] = useState(false);
  const [bookUrl, setBookUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCourseData();
    checkBookAccess();
  }, [courseId, user]);

  const fetchCourseData = async () => {
    // Obtener edición
    const { data: courseData } = await supabase
      .from('courses')
      .select('*, programa:programas(*)')
      .eq('id', courseId)
      .single();

    if (courseData) setCourse(courseData);

    // Obtener profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (!profile) return;

    // Obtener módulos inscritos de esta edición
    const { data: modulosData } = await supabase
      .from('course_enrollments')
      .select(`
        modulos!inner(*)
      `)
      .eq('student_id', profile.id)
      .eq('modulos.course_id', courseId)
      .eq('is_active', true);

    const mods = modulosData?.map(e => e.modulos) || [];
    setModulos(mods);
  };

  const checkBookAccess = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (!profile) return;

    // Verificar si tiene acceso al book
    const { data: materialAccess } = await supabase
      .from('registro_compra_materiales')
      .select('*')
      .eq('estudiante_id', profile.id)
      .eq('course_id', courseId)
      .eq('tipo_material', 'book')
      .eq('estado_pago', 'pagado')
      .single();

    if (materialAccess) {
      setHasBookAccess(true);
      // Aquí deberías obtener la URL del book desde donde lo almacenes
      // Por ejemplo, desde Supabase Storage o un campo en courses
      // setBookUrl(course.book_url);
    }
  };

  return (
    <div className="container mx-auto py-8">
      {course && (
        <>
          <h1 className="text-2xl font-bold mb-2">{course.name}</h1>
          <p className="text-gray-600 mb-6">{course.description}</p>

          {/* Mostrar libro si tiene acceso */}
          {hasBookAccess && course.material === 'book' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>📚 Material del Curso</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => window.open(bookUrl, '_blank')}>
                  Abrir Libro
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Listado de módulos */}
          <h2 className="text-xl font-semibold mb-4">Módulos</h2>
          <div className="grid gap-4">
            {modulos.map(modulo => (
              <Card key={modulo.id}>
                <CardHeader>
                  <CardTitle>Módulo {modulo.num_modulo}: {modulo.name}</CardTitle>
                  <CardDescription>
                    {new Date(modulo.start_date).toLocaleDateString()} - {' '}
                    {new Date(modulo.end_date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate(`/modulos/${modulo.id}`)}
                  >
                    Ver Semanas y Clases
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

---

### 6. Actualizar Recursos Semanales

Los recursos semanales deben actualizarse para usar `modulo_id` en lugar de `course_id`:

```sql
-- Si tienes una tabla de recursos semanales, agregar modulo_id
ALTER TABLE weekly_resources ADD COLUMN modulo_id UUID REFERENCES modulos(id);

-- Actualizar componentes para filtrar por modulo_id
```

En el componente de recursos:
```typescript
// Antes
const { data } = await supabase
  .from('weekly_resources')
  .select('*')
  .eq('course_id', courseId);

// Ahora
const { data } = await supabase
  .from('weekly_resources')
  .select('*')
  .eq('modulo_id', moduloId);
```

---

### 7. Actualizar Vista de Profesor

El profesor debe ver sus ediciones y módulos asignados:

```typescript
// src/pages/TeacherDashboard.tsx
const fetchMyEdiciones = async () => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user?.id)
    .single();

  if (!profile) return;

  // Ediciones donde es profesor principal
  const { data: courses } = await supabase
    .from('courses')
    .select('*, programa:programas(*)')
    .eq('teacher_principal_id', profile.id)
    .eq('is_active', true);

  // También obtener módulos donde es profesor adicional
  const { data: modulos } = await supabase
    .from('modulos')
    .select('*, course:courses(*)')
    .contains('aditional_teachers', [profile.id])
    .eq('is_active', true);

  // Combinar ambos
  // ...
};
```

---

### 8. Testing y Validación

#### 8.1. Crear Datos de Prueba

```sql
-- 1. Crear programa de prueba
INSERT INTO programas (name, code, description)
VALUES ('Programación Web', 'PROGWEB', 'Curso de desarrollo web fullstack');

-- 2. Crear edición de prueba
INSERT INTO courses (name, code, program_id, teacher_principal_id, academic_year, semester, start_date, numero_modulos, material)
VALUES (
  'Programación Web - Enero 2026',
  'PROGWEB-ENE-2026',
  '[program_id]',
  '[teacher_id]',
  '2026',
  'I',
  '2026-01-15',
  3,
  'book'
);

-- 3. Crear módulos
-- (Usar el componente web para esto)
```

#### 8.2. Verificar Flujos

- [ ] Crear programa ✓
- [ ] Crear edición ✓
- [ ] Crear módulos ✓
- [ ] Registrar matrícula ✓
- [ ] Verificar enrollments creados ✓
- [ ] Verificar materiales registrados ✓
- [ ] Registrar pago ✓
- [ ] Verificar acceso a book desde vista estudiante ✓
- [ ] Verificar vista de profesor ✓

---

### 9. Optimizaciones Recomendadas

#### 9.1. Índices Adicionales

```sql
-- Si experimentas lentitud, agregar más índices
CREATE INDEX idx_modulos_dates ON modulos(start_date, end_date);
CREATE INDEX idx_pagos_fecha ON pagos(fecha_pago);
CREATE INDEX idx_enrollments_active ON course_enrollments(is_active) WHERE is_active = true;
```

#### 9.2. Vistas Materializadas

Para reportes complejos, considera crear vistas:

```sql
CREATE VIEW vista_estudiantes_matriculados AS
SELECT 
  p.first_name,
  p.last_name,
  c.name as course_name,
  m.name as modulo_name,
  ce.enrolled_at
FROM course_enrollments ce
JOIN profiles p ON ce.student_id = p.id
JOIN modulos m ON ce.modulo_id = m.id
JOIN courses c ON m.course_id = c.id
WHERE ce.is_active = true;
```

---

### 10. Backup y Rollback

Antes de hacer cualquier cambio en producción:

```bash
# Backup de la base de datos
pg_dump -h [host] -U [user] -d [database] > backup_$(date +%Y%m%d).sql

# Si algo sale mal, restaurar:
psql -h [host] -U [user] -d [database] < backup_YYYYMMDD.sql
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutar migración SQL en Supabase
- [ ] Verificar que todas las tablas se crearon correctamente
- [ ] Agregar rutas en el router de React
- [ ] Agregar enlaces en la navegación del admin
- [ ] Probar crear programa
- [ ] Probar crear edición
- [ ] Probar crear módulos
- [ ] Probar registrar matrícula completa
- [ ] Probar registrar pagos
- [ ] Actualizar vista de estudiante para mostrar ediciones > módulos
- [ ] Implementar lógica de acceso a books
- [ ] Actualizar vista de profesor
- [ ] Actualizar gestión de recursos semanales
- [ ] Probar enrollments y matrículas
- [ ] Verificar políticas RLS
- [ ] Crear datos de prueba
- [ ] Hacer testing completo
- [ ] Documentar cambios para el equipo
- [ ] Capacitar a usuarios administradores

---

## 🐛 Troubleshooting Común

### Error: "relation courses_old does not exist"
**Solución:** La tabla courses_old se crea solo si existía una tabla courses previamente. Si es instalación nueva, comentar esa línea en la migración.

### Error: "foreign key violation"
**Solución:** Asegúrate de crear registros en orden:
1. Programas
2. Ediciones (courses)
3. Módulos
4. Matrículas
5. Enrollments

### Error: "permission denied for table..."
**Solución:** Verificar que las políticas RLS estén correctamente configuradas y que el usuario tenga el rol adecuado.

### No se muestran módulos al estudiante
**Solución:** Verificar que:
1. Existe enrollment activo
2. El módulo está activo
3. Las políticas RLS permiten el acceso

---

## 📞 Soporte

Si encuentras problemas durante la implementación, revisa:
1. Los logs de Supabase
2. La consola del navegador (errores de frontend)
3. El archivo `NUEVO_MODELO_PERI_INSTITUTE.md` para entender la lógica

---

**Última actualización:** 27 de enero de 2026
